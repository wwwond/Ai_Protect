import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import DownloadAuthModal from "../components/DownloadAuthModal";
import { Eye, EyeOff } from "lucide-react";

const API_USERDB_URL = import.meta.env.VITE_API_USERDB_URL;
const API_DATADB_URL = import.meta.env.VITE_API_DATADB_URL;

// --- Zod 스키마 정의 ---
const signUpSchema = z
  .object({
    emp_number: z.string().min(6, { message: "사번은 6자리 이상이어야 합니다." }).max(10), // 사번 메시지 수정
    password: z
      .string()
      .min(8, { message: "비밀번호는 8자리 이상이어야 합니다." })
      .max(20, { message: "비밀번호는 20자리 이하이어야 합니다." })
      .regex(/[a-zA-Z]/, { message: "비밀번호는 영문을 포함해야 합니다." })
      .regex(/[0-9]/, { message: "비밀번호는 숫자를 포함해야 합니다." })
      .regex(/[^a-zA-Z0-9]/, { message: "비밀번호는 특수문자를 포함해야 합니다." }),
    confirmPassword: z.string(),
    name: z.string().min(2).max(20),
    email: z.string().email({ message: "유효한 이메일 주소를 입력해주세요." }).min(1, { message: "이메일을 입력해주세요." }),
    phone: z.string().min(1, { message: "전화번호를 입력해주세요." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["confirmPassword"],
  });

type SignUpFormData = z.infer<typeof signUpSchema>;

const SignUpPage: React.FC = () => {
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phoneValue, setPhoneValue] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      emp_number: "",
      password: "",
      confirmPassword: "",
      name: "",
      email: "",
      phone: "",
    },
  });

  const onSubmit: SubmitHandler<SignUpFormData> = async (data) => {
    const { confirmPassword, ...signUpData } = data;

    try {
      const response = await fetch(`${API_USERDB_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signUpData),
      });

      if (response.ok) {
        toast.success("회원가입이 완료되었습니다!");
      } else {
        const errorData = await response.json();
        let errorMessage = "회원가입에 실패했습니다.";

        if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((e: { msg: string }) => e.msg).join(", ");
        } else if (typeof errorData.detail === "string") {
          errorMessage = errorData.detail;
        } else if (typeof errorData.detail === "object" && errorData.detail !== null) {
          errorMessage = JSON.stringify(errorData.detail);
        }

        toast.error(errorMessage);
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    }
  };

  const handleDownloadButtonClick = () => {
    setIsDownloadModalOpen(true);
  };

  const handleAuthenticateAndDownload = async (empNumber: string, password: string) => {
    setIsDownloadModalOpen(false);
    const loadingAuthToastId = toast.loading("인증 확인 중...");

    try {
      const response = await fetch(`${API_USERDB_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emp_number: empNumber, password }),
      });

      if (response.ok) {
        const { access_token } = await response.json();
        toast.success("인증 성공! 다운로드를 준비합니다.", { id: loadingAuthToastId });

        const downloadingToastId = toast.loading("애플리케이션 다운로드 중...");

        try {
          const downloadResponse = await fetch(`${API_DATADB_URL}/api/agent/download`, {
            method: "GET",
            headers: { Authorization: `Bearer ${access_token}` },
          });

          if (!downloadResponse.ok) throw new Error("다운로드 실패");

          const blob = await downloadResponse.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "AttackDetectionAgent-Installer.zip";
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);

          toast.success("애플리케이션 다운로드가 시작됩니다!", { id: downloadingToastId });
        } catch {
          toast.error("파일 다운로드 중 오류 발생", { id: downloadingToastId });
        }
      } else {
        const errorData = await response.json();
        let errorMessage = "인증 실패: 사번 또는 비밀번호를 확인해주세요.";
        if (errorData.detail) errorMessage = errorData.detail;
        toast.error(errorMessage, { id: loadingAuthToastId });
      }
    } catch {
      toast.error("네트워크 오류 발생", { id: loadingAuthToastId });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="flex flex-col md:flex-row w-full max-w-[1300px] md:h-[880px] bg-white rounded-2xl overflow-hidden">
        {/* 왼쪽 회원가입 영역 */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-sm">
            <h2 className="text-center text-3xl font-extrabold text-gray-900">회원가입</h2>
            <p className="text-center text-sm text-gray-600">환영합니다! 계정을 생성해주세요.</p>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {/* 사번 */}
              <div>
                <input
                  id="empNumber"
                  type="text"
                  placeholder="6자리 사번 입력"
                  autoComplete="username"
                  {...register("emp_number")}
                  className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                    errors.emp_number ? "border-red-500" : "border-gray-300"
                  } placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm`}
                />
                {errors.emp_number && <p className="mt-1 text-red-500 text-xs">{errors.emp_number.message}</p>}
              </div>

              {/* 비밀번호 */}
              <div className="relative">
                {/* 이 div가 input과 button을 감싸고, 이 div에 relative가 적용되어야 합니다. */}
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="비밀번호 (영문, 숫자, 특수문자 포함 8-20자)"
                    {...register("password")}
                    className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                      errors.password ? "border-red-500" : "border-gray-300"
                    } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 pr-10 sm:text-sm`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5 text-gray-500" /> : <Eye className="w-5 h-5 text-gray-500" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-red-500 text-xs">{errors.password.message}</p>}
              </div>

              {/* 비밀번호 확인 */}
              <div className="relative">
                {/* 이 div가 input과 button을 감싸고, 이 div에 relative가 적용되어야 합니다. */}
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="비밀번호 확인"
                    {...register("confirmPassword")}
                    className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                      errors.confirmPassword ? "border-red-500" : "border-gray-300"
                    } placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-gray-500 focus:border-gray-500 pr-10 sm:text-sm`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5 text-gray-500" /> : <Eye className="w-5 h-5 text-gray-500" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-red-500 text-xs">
                    {typeof errors.confirmPassword.message === "string"
                      ? errors.confirmPassword.message
                      : "비밀번호가 일치하지 않습니다."}
                  </p>
                )}
              </div>

              {/* 이름 */}
              <div className="mt-6">
                <input
                  id="name"
                  type="text"
                  placeholder="이름 (최소 2자)"
                  autoComplete="name"
                  {...register("name")}
                  className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  } placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm`}
                />
                {errors.name && <p className="mt-1 text-red-500 text-xs">{errors.name.message}</p>}
              </div>

              {/* 이메일 */}
              <div>
                <input
                  id="email"
                  type="email"
                  placeholder="이메일 (sample@email.com)"
                  {...register("email")}
                  className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm`}
                />
                {errors.email && <p className="mt-1 text-red-500 text-xs">{errors.email.message}</p>}
              </div>

              {/* 전화번호 */}
              <div>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="숫자만 입력 (01012345678)"
                  {...register("phone")}
                  value={phoneValue}
                  onChange={(e) => {
                    const numeric = e.target.value.replace(/\D/g, "");
                    setPhoneValue(numeric);
                  }}
                  className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                    errors.phone ? "border-red-500" : "border-gray-300"
                  } placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm`}
                />
                {errors.phone && <p className="mt-1 text-red-500 text-xs">{errors.phone.message}</p>}
              </div>

              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-500 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                회원가입
              </button>
            </form>

            <div className="text-sm text-center mt-6">
              <Link to="/login" className="font-medium text-gray-600 hover:text-gray-500">
                이미 계정이 있으신가요? 로그인하기
              </Link>
            </div>
          </div>
        </div>

        {/* 우측 다운로드 안내 */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-sm text-center space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              <span className="text-red-400">애플리케이션을 설치</span>할 시간입니다!
            </h2>
            <p className="text-gray-600">회원가입이 완료되면, 전용 애플리케이션을 설치하세요.</p>
            <p className="text-gray-500 text-sm">
              아래 버튼을 클릭하여 설치 파일을 다운로드하고
              <br /> 화면의 안내에 따라 설치를 진행해주세요.
            </p>
            <button
              onClick={handleDownloadButtonClick}
              className="w-full bg-gray-500 py-3 rounded-lg font-medium hover:bg-gray-700 transition text-white text-sm mt-4"
            >
              애플리케이션 다운로드
            </button>
            <div className="text-gray-400 text-xs mt-4">설치 중 문제가 발생하면 관리자에게 문의해주세요.</div>


            <div className="mt-4">
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-500">
                로그인 페이지로 돌아가기
              </Link>
            </div>
          </div>
        </div>

        <DownloadAuthModal
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          onAuthenticate={handleAuthenticateAndDownload}
        />
      </div>
    </div>
  );
};

export default SignUpPage;