import React from "react";

const ExternalAttackIPBlocking: React.FC = () => {
  return (
    <div className="p-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">외부 공격 IP 차단</h1>
      </div>

      <div className="text-sm text-gray-700 leading-relaxed space-y-6 mt-6">

        {/* 정의 */}
        <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="flex items-center text-lg font-semibold text-gray-800 mb-2">
            <span className="w-2 h-2 bg-indigo-400 rounded-full mr-2"></span>
            정의
          </h2>
          <p>
            외부 공격 IP 차단은 악성 행위가 감지된 외부 IP 주소로부터 들어오는 모든
            네트워크 접속을 자동으로 차단하는 조치입니다.
          </p>
        </section>

        {/* 목적 */}
        <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="flex items-center text-lg font-semibold text-gray-800 mb-2">
            <span className="w-2 h-2 bg-indigo-300 rounded-full mr-2"></span>
            목적
          </h2>
          <p>
            외부로부터의 사이버 위협(예: DDoS 공격, 악성봇 공격, 무차별 대입 공격 등)을
            실시간으로 차단하여 정보시스템의 안전성을 확보하고 추가 피해를 방지하기 위함입니다.
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
              해외에서 특정 웹사이트로 대규모 트래픽이 발생하여 서비스 중단이 발생한 경우,
              실시간 탐지를 통해 공격자로 판단된 IP를 즉시 차단하여 서비스 정상화를 이루었습니다.
            </li>
            <li>
              특정 IP에서 지속적으로 로그인 시도 실패가 발생할 경우, 자동으로 IP를 차단하여
              무차별 대입 공격을 차단했습니다.
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
            개별 IP 차단이 효과적이지 않을 경우, 공격자의 IP가 속한 국가 또는 IP 대역 전체를 임시
            차단하는 조치를 추가로 수행할 수 있습니다.
          </p>
        </section>

        {/* 법률적 근거 */}
        <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="flex items-center text-lg font-semibold text-gray-800 mb-2">
            <span className="w-2 h-2 bg-indigo-400 rounded-full mr-2"></span>
            법률적 근거
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            <li>
              정보통신망 이용촉진 및 정보보호 등에 관한 법률(정보통신망법) 제48조의2
              (침해사고의 대응 조치)
            </li>
            <li>
              정보보호 및 개인정보 보호 관리체계(ISMS-P) 인증 기준 및 가이드라인
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default ExternalAttackIPBlocking;
