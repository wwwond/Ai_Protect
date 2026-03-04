import React from "react";

const Blockingcertainports: React.FC = () => {
  return (
    <div className="p-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">특정 포트 차단</h1>
      </div>

      <div className="text-sm text-gray-700 leading-relaxed space-y-6 mt-6">
        {/* 정의 */}
        <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="flex items-center text-lg font-semibold text-gray-800 mb-2">
            <span className="w-2 h-2 bg-indigo-400 rounded-full mr-2"></span>
            정의
          </h2>
          <p>
            특정 포트 차단은 공격에 주로 이용되거나 취약점이 발견된 네트워크 포트를
            일시적으로 혹은 지속적으로 폐쇄하여 관련된 위협을 원천 차단하는 대응 조치입니다.
          </p>
        </section>

        {/* 목적 */}
        <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="flex items-center text-lg font-semibold text-gray-800 mb-2">
            <span className="w-2 h-2 bg-indigo-300 rounded-full mr-2"></span>
            목적
          </h2>
          <p>
            특정 포트를 악용한 네트워크 침해 사고(예: 원격 제어 공격, 데이터 유출 공격 등)를
            방지하고, 조직의 네트워크 보안 정책을 강화하여 위험을 사전에 차단하기 위함입니다.
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
              기업 내에서 사용되지 않는 원격 접속 포트가 공격에 악용된 정황이 확인된 경우,
              즉시 해당 포트를 차단하여 추가 공격을 예방했습니다.
            </li>
            <li>
              특정 포트에서 비정상적으로 대량의 데이터 유출 트래픽이 탐지되어 포트를
              자동으로 차단함으로써 데이터 유출을 방지했습니다.
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
            특정 포트 차단만으로 위협이 완전히 차단되지 않을 경우, 보다 넓은 범위의 포트를
            차단하거나, 특정 프로토콜 전체를 차단하는 추가적인 조치를 시행할 수 있습니다.
          </p>
        </section>

        {/* 법률적 근거 */}
        <section className="h-[155px] bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="flex items-center text-lg font-semibold text-gray-800 mb-2">
            <span className="w-2 h-2 bg-indigo-400 rounded-full mr-2"></span>
            법률적 근거
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            <li>정보통신망법 제48조의2 (침해사고의 대응 조치)</li>
            <li>정보통신기반 보호법 제16조 (정보통신기반시설 침해사고 대응)</li>
            <li>개인정보 보호법 제29조 (안전조치의무)</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default Blockingcertainports;
