"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Check, Loader2 } from "lucide-react";

const COUNTRIES = [
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "MX", name: "México", flag: "🇲🇽" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾" },
  { code: "BR", name: "Brasil", flag: "🇧🇷" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴" },
  { code: "PE", name: "Perú", flag: "🇵🇪" },
];

export default function RegistroPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [clinicName, setClinicName] = useState("");
  const [country, setCountry] = useState("AR");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 3
  const [acceptTerms, setAcceptTerms] = useState(false);

  const passwordValid = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);

  async function handleSubmit() {
    if (!acceptTerms) { setError("Debés aceptar los términos"); return; }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicName, country, city, phone, ownerName, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Error al crear la cuenta");
        setLoading(false);
        return;
      }

      // Save token and redirect
      document.cookie = `df_token=${encodeURIComponent(data.token)}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
      localStorage.setItem("df_welcome", "1");
      router.push("/dashboard");
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50/40 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg font-bold">DF</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">
              Dental<span className="text-primary-600">Flow</span>
            </span>
          </a>
          <p className="text-sm text-gray-500 mt-2">Creá tu cuenta y empezá tu prueba gratis de 14 días</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                s < step ? "bg-emerald-500 text-white"
                : s === step ? "bg-primary-600 text-white"
                : "bg-gray-200 text-gray-500"
              }`}>
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${s < step ? "bg-emerald-500" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8">
          {/* Step 1: Clinic */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Tu clínica</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la clínica *</label>
                <input
                  type="text"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="Ej: Dental Smile"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">País *</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ej: Buenos Aires"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono de la clínica</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej: +54 11 5555 1234"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <button
                onClick={() => { if (clinicName.trim().length >= 2) setStep(2); else setError("El nombre de la clínica es obligatorio"); }}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                Siguiente <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 2: Account */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Tu cuenta</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Ej: Dr. Juan Pérez"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@clinica.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                {password && !passwordValid && (
                  <p className="text-xs text-red-500 mt-1">Mínimo 8 caracteres, 1 mayúscula y 1 número</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetí tu contraseña"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2">
                  <ArrowLeft className="h-4 w-4" /> Atrás
                </button>
                <button
                  onClick={() => {
                    if (!ownerName.trim()) { setError("El nombre es obligatorio"); return; }
                    if (!email.trim()) { setError("El email es obligatorio"); return; }
                    if (!passwordValid) { setError("La contraseña no cumple los requisitos"); return; }
                    if (password !== confirmPassword) { setError("Las contraseñas no coinciden"); return; }
                    setError("");
                    setStep(3);
                  }}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2"
                >
                  Siguiente <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Confirmación</h2>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Clínica</span><span className="font-medium text-gray-900">{clinicName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">País</span><span className="font-medium text-gray-900">{COUNTRIES.find((c) => c.code === country)?.flag} {COUNTRIES.find((c) => c.code === country)?.name}</span></div>
                {city && <div className="flex justify-between"><span className="text-gray-500">Ciudad</span><span className="font-medium text-gray-900">{city}</span></div>}
                <div className="flex justify-between"><span className="text-gray-500">Propietario</span><span className="font-medium text-gray-900">{ownerName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium text-gray-900">{email}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Plan</span><span className="font-medium text-emerald-600">Starter — 14 días gratis</span></div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-xs text-gray-600">
                  Acepto los{" "}
                  <a href="#" className="text-primary-600 underline">Términos de Servicio</a> y la{" "}
                  <a href="https://www.violetwaveai.com/dentalflow/politica-de-privacidad" target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">Política de Privacidad</a>
                </span>
              </label>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2">
                  <ArrowLeft className="h-4 w-4" /> Atrás
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !acceptTerms}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Crear mi cuenta gratis <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </div>
          )}

          {error && step !== 3 && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          ¿Ya tenés cuenta? <a href="/login" className="text-primary-600 font-medium hover:underline">Iniciar sesión</a>
        </p>
      </div>
    </div>
  );
}
