# src/routes/analysis.py

import json
import re
from fastapi import APIRouter, Depends
from pydantic import BaseModel

# --- 필요한 모듈 import ---
from ..utils.auth import get_current_user
from ..models.models import User
from ..services.langchain_agent.tools import llm, tool_map
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

# --- API 라우터 설정 ---
router = APIRouter(prefix="/api/analysis", tags=["Analysis Q&A"])
class QuestionRequest(BaseModel):
    question: str

# --- '교통정리' 담당 라우터 체인 정의 ---
router_prompt_template = """
당신의 임무는 사용자의 질문을 분석하여 아래 카테고리 중 가장 적합한 하나를 선택하는 것입니다.
오직 소문자로 된 카테고리 이름 하나만 답변해야 합니다.

[카테고리]
- attack: '내 공격 기록 보여줘'와 같이 특정 공격 기록 목록을 조회하는 질문
- log_summary: '오늘 위협 통계', '최신 로그' 등 로그 및 공격 데이터에 대한 '통계'나 '요약 보고서'를 요청하는 질문
- traffic_summary: 'IP별 트래픽 사용량', '시간대별 패킷 흐름' 등 네트워크 트래픽에 대한 '통계'나 '요약 보고서'를 요청하는 질문
- security_knowledge: 'DDoS란 무엇인가?'처럼 보안 개념, 용어, 대응법에 대한 설명을 요청하는 질문
- general_conversation: 인사, 잡담 등 위 카테고리에 해당하지 않는 모든 대화

---
[예시]
Question: 오늘 위협 통계 보여줘
Choice: log_summary
Question: DDoS 공격 대응법 알려줘
Choice: security_knowledge
---
이제 다음 질문을 분류하세요.
Question: {question}
Choice:"""
router_prompt = PromptTemplate.from_template(router_prompt_template)
router_chain = router_prompt | llm | StrOutputParser()


# --- 메인 API 엔드포인트 ---
@router.post("/ask")
async def ask_question(
    request: QuestionRequest,
    current_user: User = Depends(get_current_user)
):
    """사용자의 질문을 라우팅하고, 전문가 도구를 실행한 뒤, 최종 결과를 요약하여 답변합니다."""
    question = request.question
    user_id = current_user.user_id
    print(f"--- [요청 시작] User ID: {user_id}, Question: {question} ---")

    # 1. 라우터로 담당 전문가 선택
    chosen_tool_name = await router_chain.ainvoke({"question": question})
    chosen_tool_name = chosen_tool_name.strip().lower()
    print(f"--- [라우터 선택]: {chosen_tool_name} ---")

    if chosen_tool_name not in tool_map:
        chosen_tool_name = "general_conversation"
    selected_tool = tool_map[chosen_tool_name]

    # 2. 도구 실행
    action_input = f"[User ID: {user_id}] {question}" if chosen_tool_name in ["log_summary", "traffic_summary", "attack"] else question
    
    tool_result = await selected_tool.ainvoke(action_input)
    print(f"--- [도구 실행 결과]: {tool_result} ---")
    
    # 3. 최종 답변 생성
    final_answer = ""
    
    if chosen_tool_name == "traffic_summary":
        try:
            data = json.loads(tool_result)
            overall_stats = data.get("overall_stats", {})
            if (overall_stats.get("total_packets", 0) == 0 and not data.get("top_ports") and not data.get("top_source_ips")):
                 return {"answer": "해당 기간에 분석할 유의미한 트래픽 데이터가 없습니다."}
        except (json.JSONDecodeError, AttributeError):
            return {"answer": tool_result}

        # ▼▼▼ [핵심 수정] AI의 역할을 명확히 하고, 자연스러운 한국어 문장 보고서를 유도합니다. ▼▼▼
        final_summary_template = """
        당신은 [오직 한국어로만 보고서를 작성하는 데이터 분석가]입니다.

        [절대 규칙]
        1. 답변의 첫 글자부터 마지막 글자까지, 단 하나의 영어 단어도 사용하지 마세요.
        2. 보고서 내용 외에, 'Note'나 'Final Report'와 같은 부가적인 설명이나 요약을 절대로 덧붙이지 마세요.

        [지시사항]
        아래 [분석 데이터]를 사용하여, 다음 항목들을 포함하는 자연스러운 문장의 한국어 보고서를 작성하세요. Markdown을 사용하여 목록을 보기 좋게 만드세요.
        1.  **주요 통계**: '총 패킷'과 '총 데이터량'을 보고하세요.
        2.  **상위 통신 IP**: `top_source_ips` 목록의 각 IP에 대해 순위를 매겨 IP 주소, 연결 횟수, 총 패킷, 총 데이터량을 모두 포함하여 설명하세요. 목록이 비어있으면 "상위 통신 IP 데이터가 없습니다."라고 작성하세요.
        3.  **상위 사용 포트**: `top_ports` 목록의 각 포트에 대해 순위를 매겨 포트 번호와 사용 횟수를 설명하세요. 목록이 비어있으면 "상위 사용 포트 데이터가 없습니다."라고 작성하세요.

        [분석 데이터]
        - 원본 질문: {question}
        - 조회된 데이터 (JSON): {result}
        
        이제, 위의 규칙을 반드시 지켜서 완벽한 한국어 보고서를 작성하세요:
        """
        final_summary_prompt = PromptTemplate.from_template(final_summary_template)
        final_chain = final_summary_prompt | llm | StrOutputParser()
        final_answer = await final_chain.ainvoke({"question": question, "result": tool_result})

    elif chosen_tool_name == "log_summary":
        try:
            data = json.loads(tool_result)
            if (data.get("log_count_summary", {}).get("log_count", 0) == 0 and not data.get("threat_summary", {}).get("distribution")):
                return {"answer": "해당 기간에 분석할 유의미한 로그 데이터가 없습니다."}
        except (json.JSONDecodeError, AttributeError):
            return {"answer": tool_result}
            
        # ▼▼▼ [핵심 수정] AI의 역할을 명확히 하고, 자연스러운 한국어 문장 보고서를 유도합니다. ▼▼▼
        final_summary_template = """
        당신은 [오직 한국어로만 보고서를 작성하는 보안 분석가]입니다.

        [절대 규칙]
        1. 답변의 첫 글자부터 마지막 글자까지, 단 하나의 영어 단어도 사용하지 마세요.
        2. 보고서 내용 외에, 'Note'나 'Final Report'와 같은 부가적인 설명이나 요약을 절대로 덧붙이지 마세요.

        [지시사항]
        아래 [분석 데이터]를 사용하여, 다음 항목들을 포함하는 자연스러운 문장의 한국어 보고서를 작성하세요. Markdown을 사용하여 목록을 보기 좋게 만드세요.
        1. **로그 발생 현황**: '총 로그 수'를 보고하세요.
        2. **위협 통계 요약**: '총 위협 탐지' 횟수와 '주요 위협 유형'을 설명하세요. '위협 유형 분포'를 목록으로 보여주세요. 데이터가 없으면 "탐지된 위협이 없습니다."라고 작성하세요.
        3. **최근 탐지된 주요 위협**: `recent_threats` 목록에 있는 내용을 시간, 위협 종류, 출처 순으로 요약하세요. 목록이 비어있으면 "최근 탐지된 위협이 없습니다."라고 작성하세요.

        [분석 데이터]
        - 원본 질문: {question}
        - 조회된 데이터 (JSON): {result}

        이제, 위의 규칙을 반드시 지켜서 완벽한 한국어 보고서를 작성하세요:
        """
        final_summary_prompt = PromptTemplate.from_template(final_summary_template)
        final_chain = final_summary_prompt | llm | StrOutputParser()
        final_answer = await final_chain.ainvoke({"question": question, "result": tool_result})

    elif chosen_tool_name == "security_knowledge":
        final_answer = tool_result.get('result', "답변을 생성하지 못했습니다.")
    else:
        final_answer = tool_result

    return {"answer": final_answer}
