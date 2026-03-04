# src/services/langchain_agent/tools.py

# ===============================================================
# [중요] 호환성 패치
# ===============================================================
import os
# OMP: Error #15 해결: 중복된 OpenMP 런타임 라이브러리 로드를 허용합니다.
os.environ['KMP_DUPLICATE_LIB_OK']='True'
import numpy as np
try:
    # NumPy 2.0 호환성 문제 해결
    _ = np.float_
except AttributeError:
    print("--- [호환성 패치 적용] NumPy 2.0+ 환경에서 np.float_를 np.float64로 대체합니다. ---")
    np.float_ = np.float64
# --- 패치 코드 끝 ---

import json
import traceback
import re
import asyncio
from sqlalchemy import create_engine, text, select, func
from sqlalchemy.ext.asyncio import AsyncSession
from langchain.tools import tool
from langchain_community.utilities import SQLDatabase
from langchain_ollama.chat_models import ChatOllama
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from elasticsearch import AsyncElasticsearch

# RAG 도구를 위한 import
from langchain.chains import RetrievalQA, create_sql_query_chain
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

# 프로젝트 내부 모듈 import
from ...core.database import AsyncSessionLocal
from ...core.config import settings
# (사용자 제공 파일명에 맞춰 log_data.py로 가정)
from .log_data import log_user_service
from .packet_data import traffic_user_service
from ...models.models import AttackLog, AttackTraffic


# --- 1. 공통 LLM 및 클라이언트 초기화 ---
llm = ChatOllama(model="llama3:latest")

es_client = AsyncElasticsearch(
    f"{settings.elasticsearch_host}:{settings.elasticsearch_port}",
    request_timeout=settings.elasticsearch_request_timeout
)

# --- 2. 헬퍼 함수 ---
def _parse_input(question_with_context: str) -> tuple[str, str] | None:
    """입력에서 user_id와 question을 파싱하는 안정적인 헬퍼 함수"""
    match = re.search(r"\[User ID: ([\w\-.]+)\]", question_with_context)
    if not match: return None
    user_id = match.group(1)
    question = question_with_context.replace(match.group(0), "").strip()
    return user_id, question

def _extract_time_range(question: str) -> str:
    """질문에서 '1시간', '3일' 등 시간 표현을 찾아 '1h', '3d' 같은 형식으로 변환합니다."""
    time_match = re.search(r"(\d+)\s*(시간|일|분)", question)
    if time_match:
        value = int(time_match.group(1))
        unit_char = time_match.group(2)[0]
        if unit_char == '시': unit = 'h'
        elif unit_char == '일': unit = 'd'
        elif unit_char == '분': unit = 'm'
        else: return "24h"
        return f"{value}{unit}"
    elif "오늘" in question or "하루" in question:
        return "24h"
    return "7d"

# --- 3. 전문가 도구(Tool) 정의 ---

@tool
async def attack_search_tool(question_with_context: str) -> str:
    """PostgreSQL의 'Attack_log'와 'Attack_traffic' 테이블에서 사용자의 '공격(attack)' 기록 목록을 검색합니다."""
    db_session: AsyncSession = AsyncSessionLocal()
    try:
        parsed = _parse_input(question_with_context)
        if not parsed: return "오류: 입력 형식이 잘못되었습니다."
        user_id, question = parsed
        
        time_range = _extract_time_range(question)
        sql_interval = time_range.replace('h', ' hour').replace('d', ' day').replace('m', ' minute')
        
        time_filter_sql = f"AND detected_at >= NOW() - INTERVAL '{sql_interval}'"
        traffic_time_filter_sql = f"AND \"@timestamp\" >= NOW() - INTERVAL '{sql_interval}'"

        log_query = text(f"SELECT detected_at, attack_type, source_address FROM \"Attack_log\" WHERE user_id = :user_id {time_filter_sql} ORDER BY detected_at DESC LIMIT 10")
        log_result = await db_session.execute(log_query, {"user_id": user_id})
        log_list = log_result.mappings().all()

        traffic_query = text(f"SELECT \"@timestamp\" as detected_at, 'Traffic Anomaly' as attack_type, \"Src_IP\" as source_address FROM \"Attack_traffic\" WHERE user_id = :user_id {traffic_time_filter_sql} ORDER BY \"@timestamp\" DESC LIMIT 10")
        traffic_result = await db_session.execute(traffic_query, {"user_id": user_id})
        traffic_list = traffic_result.mappings().all()

        if not log_list and not traffic_list:
            return "해당 기간의 공격 데이터를 찾을 수 없습니다."

        final_report = f"최근 {time_range} 동안 조회된 공격 데이터는 다음과 같습니다.\n"
        if log_list:
            final_report += "\n[로그 기반 공격]\n"
            for item in log_list: final_report += f"- 시간: {item['detected_at']}, 유형: {item['attack_type']}, 출처: {item['source_address']}\n"
        if traffic_list:
            final_report += "\n[트래픽 기반 공격]\n"
            for item in traffic_list: final_report += f"- 시간: {item['detected_at']}, 유형: {item['attack_type']}, 출처: {item['source_address']}\n"
        
        return final_report
    except Exception as e:
        return f"공격 데이터 조회 중 오류가 발생했습니다: {e}"
    finally:
        await db_session.close()

@tool
async def log_summary_tool(question_with_context: str) -> str:
    """로그 및 공격 데이터에 대한 '통계'나 '요약 보고서'를 요청할 때 사용합니다."""
    db_session: AsyncSession = AsyncSessionLocal()
    try:
        parsed = _parse_input(question_with_context)
        if not parsed: return "오류: 입력에서 User ID를 찾을 수 없습니다."
        user_id, question = parsed
        
        time_range = _extract_time_range(question)

        # ▼▼▼ [수정] DB 세션 충돌을 피하기 위해 DB 관련 작업은 순차적으로 실행합니다. ▼▼▼
        # ES 작업은 병렬로 실행하여 효율성 유지
        es_task = asyncio.create_task(log_user_service.get_log_count(es_client, user_id, time_range))

        # DB 작업들은 await으로 순차 처리
        threat_summary_result = await log_user_service.get_threat_summary(db_session, user_id, time_range)
        recent_threats_result = await log_user_service.get_recent_threat_logs(db_session, user_id, limit=5)
        
        # 병렬로 시작했던 ES 작업의 결과를 기다림
        log_count_result = await es_task
        
        combined_data = {
            "log_count_summary": log_count_result,
            "threat_summary": threat_summary_result,
            "recent_threats": recent_threats_result
        }
        return json.dumps(combined_data, default=str, ensure_ascii=False)
    except Exception as e:
        return f"로그 통계 조회 중 오류가 발생했습니다: {e}"
    finally:
        await db_session.close()

@tool
async def traffic_summary_tool(question_with_context: str) -> str:
    """네트워크 트래픽에 대한 '통계'나 '요약 보고서'를 요청할 때 사용합니다."""
    try:
        parsed = _parse_input(question_with_context)
        if not parsed: return "오류: 입력에서 User ID를 찾을 수 없습니다."
        user_id, question = parsed

        time_range = _extract_time_range(question)

        # ▼▼▼ [버그 수정] get_traffic_over_time 함수에도 time_range를 전달하도록 수정했습니다. ▼▼▼
        tasks = [
            traffic_user_service.get_overall_traffic_stats(es_client, user_id, time_range),
            traffic_user_service.get_traffic_over_time(es_client, user_id, time_range=time_range),
            traffic_user_service.get_top_ports(es_client, user_id, time_range=time_range),
            traffic_user_service.get_traffic_summary_by_ip(es_client, user_id, time_range=time_range)
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        combined_data = {
            "overall_stats": results[0] if not isinstance(results[0], Exception) else {"error": str(results[0])},
            "traffic_over_time": results[1] if not isinstance(results[1], Exception) else {"error": str(results[1])},
            "top_ports": results[2] if not isinstance(results[2], Exception) else {"error": str(results[2])},
            "top_source_ips": results[3] if not isinstance(results[3], Exception) else {"error": str(results[3])}
        }
        return json.dumps(combined_data, default=str, ensure_ascii=False)
    except Exception as e:
        return f"트래픽 통계 조회 중 오류가 발생했습니다: {e}"

@tool
async def security_knowledge_tool(question: str) -> dict:
    """'DDoS란?', '피싱 대응법' 등 보안 개념이나 지식에 대한 '설명'이 필요할 때 사용합니다."""
    embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-m3")
    vectordb = Chroma(persist_directory="./chroma_db", embedding_function=embeddings)
    prompt_template = "Context: {context}\n\nQuestion: {question}\n\nAnswer in Korean:"
    PROMPT = PromptTemplate(template=prompt_template, input_variables=["context", "question"])
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm, chain_type="stuff", retriever=vectordb.as_retriever(),
        return_source_documents=True, chain_type_kwargs={"prompt": PROMPT}
    )
    result = await qa_chain.ainvoke(question)
    return result

# ▼▼▼ [수정] 일반 대화 도구에 자연스러운 한국어 답변을 위한 프롬프트를 추가합니다. ▼▼▼
general_conversation_prompt_template = """
당신은 사용자와 자연스럽게 대화하는 친절한 AI 어시스턴트입니다.
사용자의 질문에 대해, 반드시 한국어로만, 그리고 친근하고 자연스러운 말투로 답변해주세요.
불필요한 영어 단어나 문장을 섞어 쓰지 마세요.

사용자 질문: {question}
AI 답변:"""
general_conversation_prompt = PromptTemplate.from_template(general_conversation_prompt_template)

@tool
async def general_conversation_tool(question: str) -> str:
    """사용자의 일반적인 질문, 인사, 또는 다른 도구로 분류할 수 없는 모든 대화에 사용됩니다."""
    chain = general_conversation_prompt | llm | StrOutputParser()
    return await chain.ainvoke({"question": question})

# --- 4. 라우터가 사용할 최종 도구 맵 ---
tool_map = {
    "attack": attack_search_tool,
    "traffic_summary": traffic_summary_tool,
    "log_summary": log_summary_tool,
    "security_knowledge": security_knowledge_tool,
    "general_conversation": general_conversation_tool,
}
