import { useEffect, useRef } from 'react';
import i18n, { LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES, type AppLanguage } from '@/i18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const isSupported = (lng: string | null | undefined): lng is AppLanguage =>
  !!lng && SUPPORTED_LANGUAGES.some((l) => l.code === lng);

/**
 * Sincroniza o idioma escolhido com a conta do usuário:
 * - Ao entrar, se a conta tiver um idioma salvo diferente do atual, aplica-o.
 * - Se a conta não tiver idioma salvo, grava o idioma atual (do navegador).
 * - Ao trocar de idioma, grava a nova escolha na conta.
 * Assim a preferência vale em qualquer dispositivo/sessão.
 */
export function useLanguageSync() {
  const { user } = useAuth();
  const syncedFor = useRef<string | null>(null);

  // Restaura o idioma da conta ao entrar (ou grava o atual se a conta não tiver).
  useEffect(() => {
    if (!user || syncedFor.current === user.id) return;
    syncedFor.current = user.id;

    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('language')
        .eq('user_id', user.id)
        .maybeSingle();

      const saved = data?.language;
      if (isSupported(saved)) {
        if (saved !== i18n.language) {
          try { window.localStorage.setItem(LANGUAGE_STORAGE_KEY, saved); } catch { /* ignore */ }
          await i18n.changeLanguage(saved); // dispara o reload via LanguageRoot
        }
      } else if (isSupported(i18n.language)) {
        // Conta sem idioma salvo: grava o idioma atual do navegador.
        await supabase.from('profiles').update({ language: i18n.language }).eq('user_id', user.id);
      }
    })();
  }, [user]);

  // Grava na conta sempre que o usuário trocar de idioma.
  useEffect(() => {
    if (!user) return;
    const onChange = (lng: string) => {
      if (!isSupported(lng)) return;
      // O builder do PostgREST só dispara a requisição quando é aguardado —
      // por isso o update precisa ser awaitado de verdade.
      void (async () => {
        try {
          await supabase.from('profiles').update({ language: lng }).eq('user_id', user.id);
        } catch { /* ignora falhas de rede; o localStorage já guardou a escolha */ }
      })();
    };
    i18n.on('languageChanged', onChange);
    return () => { i18n.off('languageChanged', onChange); };
  }, [user]);
}
