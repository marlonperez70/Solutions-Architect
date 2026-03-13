import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center space-y-6 max-w-md">
          <h1 className="text-4xl font-bold text-white">Enterprise Platform</h1>
          <p className="text-gray-300 text-lg">
            Plataforma de gestión empresarial con agentes de IA especializados
          </p>
          <Button
            size="lg"
            onClick={() => (window.location.href = getLoginUrl())}
            className="w-full"
          >
            Iniciar Sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-4xl font-bold text-slate-900">
          ¡Bienvenido, {user?.name}!
        </h1>
        <p className="text-gray-600 text-lg">
          Accede al dashboard para gestionar tus agentes, eventos y alertas
        </p>
        <Button
          size="lg"
          onClick={() => setLocation("/dashboard")}
          className="w-full"
        >
          Ir al Dashboard
        </Button>
      </div>
    </div>
  );
}
