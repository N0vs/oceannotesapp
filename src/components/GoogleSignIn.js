import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

/**
 * Componente para Google Sign-In
 * Integra com Google OAuth 2.0
 */
const GoogleSignIn = ({ onSuccess, onError, buttonText = "Continuar com Google" }) => {
  const router = useRouter();

  useEffect(() => {
    // Carregar o script do Google Identity Services
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleSignIn;
    document.head.appendChild(script);

    return () => {
      // Cleanup: remover o script quando o componente for desmontado
      document.head.removeChild(script);
    };
  }, []);

  const initializeGoogleSignIn = () => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      });

      // Renderizar o botão Google
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: '100%'
        }
      );
    }
  };

  const handleGoogleResponse = async (response) => {
    try {
      console.log('Token Google recebido');
      
      // Enviar o token para nossa API
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: response.credential
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        console.log('Login Google bem-sucedido:', data.user.nome);
        
        // Definir cookie (já foi definido pelo servidor, mas garantir no client)
        if (data.token) {
          Cookies.set('token', data.token, { expires: 1 }); // 1 dia
        }

        if (onSuccess) {
          onSuccess(data);
        } else {
          // Redirecionar para dashboard
          router.push('/dashboard');
        }
      } else {
        console.error('Erro no login Google:', data.message);
        if (onError) {
          onError(data.message || 'Erro no login com Google');
        }
      }
    } catch (error) {
      console.error('Erro na autenticação Google:', error);
      if (onError) {
        onError('Erro de conexão. Tente novamente.');
      }
    }
  };

  return (
    <div className="w-full">
      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">ou</span>
        </div>
      </div>
      
      <div id="google-signin-button" className="w-full"></div>
      
      <div className="mt-2 text-center">
        <p className="text-xs text-gray-500">
          Ao continuar com Google, você concorda com nossos termos de uso
        </p>
      </div>
    </div>
  );
};

export default GoogleSignIn;
