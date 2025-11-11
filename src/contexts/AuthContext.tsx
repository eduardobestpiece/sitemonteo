import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ID da empresa Monteo Investimentos
const MONTEO_COMPANY_ID = '62855c99-3a9a-41a1-80bd-b4ea8d2a22b1';

interface CrmUser {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  role: 'master' | 'admin' | 'leader' | 'user';
  company_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  crmUser: CrmUser | null;
  loading: boolean;
  isAuthorized: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  checkAuthorization: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [crmUser, setCrmUser] = useState<CrmUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const checkAuthorization = async (userToCheck: User | null = null): Promise<boolean> => {
    const userToVerify = userToCheck || user;
    
    if (!userToVerify) {
      setIsAuthorized(false);
      setCrmUser(null);
      return false;
    }

    try {
      // Buscar usuário na tabela crm_users
      const { data: crmUserData, error } = await supabase
        .from('crm_users')
        .select('id, email, first_name, last_name, role, company_id')
        .eq('email', userToVerify.email)
        .eq('status', 'active')
        .single();

      if (error || !crmUserData) {
        setIsAuthorized(false);
        setCrmUser(null);
        return false;
      }

      // Verificar se é master ou admin
      const isMasterOrAdmin = crmUserData.role === 'master' || crmUserData.role === 'admin';
      
      // Verificar se pertence à empresa Monteo Investimentos (ou é master)
      const belongsToMonteo = crmUserData.role === 'master' || crmUserData.company_id === MONTEO_COMPANY_ID;

      const authorized = isMasterOrAdmin && belongsToMonteo;

      if (authorized) {
        setCrmUser(crmUserData as CrmUser);
        setIsAuthorized(true);
      } else {
        setCrmUser(null);
        setIsAuthorized(false);
      }

      return authorized;
    } catch (error) {
      console.error('Erro ao verificar autorização:', error);
      setIsAuthorized(false);
      setCrmUser(null);
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Verificar sessão atual
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        // Aguardar um pouco para garantir que o user está atualizado
        setTimeout(async () => {
          if (mounted) {
            await checkAuthorization(currentUser);
            setLoading(false);
          }
        }, 100);
      } else {
        setIsAuthorized(false);
        setCrmUser(null);
        setLoading(false);
      }
    });

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        // Aguardar um pouco para garantir que o user está atualizado
        setTimeout(async () => {
          if (mounted) {
            await checkAuthorization(currentUser);
            setLoading(false);
          }
        }, 100);
      } else {
        setIsAuthorized(false);
        setCrmUser(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error) {
      // Após login bem-sucedido, verificar autorização
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const authorized = await checkAuthorization(session.user);
        if (!authorized) {
          // Se não for autorizado, fazer logout
          await supabase.auth.signOut();
          return { 
            error: { 
              message: 'Acesso negado. Apenas administradores da Monteo Investimentos e Master podem acessar.' 
            } 
          };
        }
      }
    }
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setCrmUser(null);
    setIsAuthorized(false);
  };

  const value = {
    user,
    session,
    crmUser,
    loading,
    isAuthorized,
    signIn,
    signOut,
    checkAuthorization,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

