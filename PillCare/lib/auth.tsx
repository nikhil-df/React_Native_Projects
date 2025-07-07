import { Session } from "@supabase/supabase-js";
import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

     

interface AuthContextType {
    session: Session | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    loading: true,
});

export default function AuthProvider({ children }: PropsWithChildren) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
    const fetchSession = async () => {
        const { data, error } = await supabase.auth.getSession();
        setSession(data.session);
        setLoading(false);
    };

    fetchSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
        setSession(session);
    });

    return () => {
        subscription.subscription?.unsubscribe();
    };
}, []);
    return (
        <AuthContext.Provider value={{ session, loading }}>
            {children}
        </AuthContext.Provider>
    );
}


export const useAuth = () => useContext(AuthContext);