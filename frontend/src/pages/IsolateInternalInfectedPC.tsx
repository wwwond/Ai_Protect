import React from "react";

const IsolateInternalInfectedPC: React.FC = () => {
  return (
    <div className="p-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">내부 감염 PC 격리</h1>
      </div>

      <div className="text-sm text-gray-700 leading-relaxed space-y-6 mt-6">
        {/* 정의 */}
        <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="flex items-center text-lg font-semibold text-gray-800 mb-2">
            <span className="w-2 h-2 bg-indigo-400 rounded-full mr-2"></span>
            정의
          </h2>
          <p>
            내부 감염 PC 격리는 악성코드나 랜섬웨어 등 악성 행위에 감염된 내부 PC의
            네트워크 접근을 제한하여 네트워크 내에서의 확산을 방지하는 조치입니다.
          </p>
        </section>

        {/* 목적 */}
        <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="flex items-center text-lg font-semibold text-gray-800 mb-2">
            <span className="w-2 h-2 bg-indigo-300 rounded-full mr-2"></span>
            목적
          </h2>
          <p>
            내부 시스템에서 발생한 보안 사고가 조직 전체로 확산되는 것을 방지하며,
            사고의 영향을 최소화하고 추가적인 피해를 예방하기 위함입니다.
          </p>
        </section>

        {/* 예시 시나리오 */}
        <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="flex items-center text-lg font-semibold text-gray-800 mb-2">
            <span className="w-2 h-2 bg-indigo-400 rounded-full mr-2"></span>
            예시 시나리오
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            <li>
              직원이 악성 이메일을 통해 랜섬웨어에 감염되었을 때, 즉시 감염된 PC를
              네트워크에서 자동 격리하여 다른 PC로의 감염을 차단하고 데이터 유출을 방지했습니다.
            </li>
            <li>
              내부 시스템 모니터링 중 특정 PC가 불규칙한 네트워크 트래픽을 발생시키는 것이
              탐지되어, 해당 PC를 자동 격리해 추가 피해를 예방했습니다.
            </li>
          </ul>
        </section>

        {/* 대체 대응 방안 */}
        <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="flex items-center text-lg font-semibold text-gray-800 mb-2">
            <span className="w-2 h-2 bg-indigo-300 rounded-full mr-2"></span>
            대체 대응 방안
          </h2>
          <p>
            자동 격리가 기술적으로 실패하거나 감염이 이미 확산된 경우, 관리자 개입을 통해
            수동으로 네트워크 스위치나 라우터를 통해 격리 조치를 수행할 수 있습니다.
          </p>
        </section>

        {/* 법률적 근거 */}
        <section className="h-[155px] bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="flex items-center text-lg font-semibold text-gray-800 mb-2">
            <span className="w-2 h-2 bg-indigo-400 rounded-full mr-2"></span>
            법률적 근거
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            <li>개인정보 보호법 제29조 (안전조치의무)</li>
            <li>정보통신망법 제28조 (개인정보의 보호조치)</li>
            <li>정보통신기반 보호법 제16조 (정보통신기반시설 침해사고 대응)</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default IsolateInternalInfectedPC;
