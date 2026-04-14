import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { getCurrentHealthUser } from "../src/features/health/data/health";
import { supabase } from "../src/lib/supabase/client";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      const user = await getCurrentHealthUser();

      if (!isMounted) {
        return;
      }

      setHasSession(Boolean(user));
      setIsAuthResolved(true);
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      setHasSession(Boolean(session?.user));
      setIsAuthResolved(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isAuthResolved) {
      return;
    }

    const inSignInRoute = segments[0] === "sign-in";

    if (!hasSession && !inSignInRoute) {
      router.replace("/sign-in");
      return;
    }

    if (hasSession && inSignInRoute) {
      router.replace("/");
    }
  }, [hasSession, isAuthResolved, router, segments]);

  if (!isAuthResolved) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: "#f3ecdf",
        },
      }}
    />
  );
}
