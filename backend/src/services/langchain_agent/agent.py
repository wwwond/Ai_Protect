# src/services/langchain_agent/agent.py

from langchain.agents import AgentExecutor, create_react_agent
from langchain_core.prompts import PromptTemplate
from .tools import master_tools, llm

# 🚨 async def로 변경하여 비동기 코드베이스와의 일관성을 맞춥니다.
async def get_master_agent():
    """
    모든 전문가 도구를 사용하여 질문을 해결하는 마스터 에이전트를 생성합니다.
    
    참고: 이 함수 자체는 동기적으로 작동하지만, 반환된 에이전트는
    비동기 실행을 위해 `ainvoke` 메서드를 사용해야 합니다.
    (예: `await agent_executor.ainvoke(...)`)
    """

    template = """
당신은 최고의 AI 어시스턴트입니다. 당신의 임무는 사용자의 질문을 이해하고,
가장 적합한 전문가 도구에게 작업을 위임하여 얻은 정보를 바탕으로, 최종 답변을 한국어로 제공하는 것입니다.

사용 가능한 전문가 도구 목록:
{tools}

## 중요 규칙 (반드시 지켜야 함):
- 'Action:' 뒤에는 반드시 [{tool_names}]에 있는 도구 이름 중 하나만 적어야 합니다.
- 'Action Input:' 뒤에는 해당 도구에 전달할 입력값만 정확히 적어야 합니다.
- 모든 최종 답변은 반드시 'Final Answer:' 뒤에 **오직 한국어로만, 다른 부가 설명이나 영어 번역 없이** 작성해야 합니다.

## 이제 시작합니다!

Question: {input}
Thought:{agent_scratchpad}
"""
    
    prompt = PromptTemplate.from_template(template)
    agent = create_react_agent(llm, master_tools, prompt)
    
    agent_executor = AgentExecutor(
        agent=agent, 
        tools=master_tools, 
        verbose=True, 
        handle_parsing_errors=True
    )
    
    return agent_executor
