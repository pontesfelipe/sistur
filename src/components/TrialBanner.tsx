import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X, ArrowRight, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLicense } from '@/contexts/LicenseContext';
import { cn } from '@/lib/utils';

export function TrialBanner() {
  const { isTrialActive, isTrialExpired, isPaidPlan, trialDaysRemaining, plan } = useLicense();
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  // Don't show for paid plans or dismissed
  if (isPaidPlan || dismissed || !plan) return null;

  // Don't show if no trial info
  if (!isTrialActive && !isTrialExpired) return null;

  const urgent = isTrialExpired || trialDaysRemaining <= 2;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className={cn(
          'relative overflow-hidden border-b',
          urgent
            ? 'bg-gradient-to-r from-red-950/80 to-orange-950/60 border-red-800/50'
            : 'bg-gradient-to-r from-amber-950/60 to-yellow-950/40 border-amber-800/30',
        )}
      >
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm min-w-0">
            {urgent ? (
              <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
            ) : (
              <Clock className="h-4 w-4 text-amber-400 flex-shrink-0" />
            )}
            <span className={cn('font-medium truncate', urgent ? 'text-red-300' : 'text-amber-300')}>
              {isTrialExpired
                ? 'Seu período de avaliação expirou.'
                : trialDaysRemaining <= 1
                ? 'Último dia do trial! Atualize agora.'
                : `${trialDaysRemaining} dias restantes no trial gratuito.`
              }
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => navigate('/assinatura')}
              className={cn(
                'text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors',
                urgent
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-amber-950',
              )}
            >
              Ver Planos <ArrowRight className="h-3 w-3" />
            </button>
            {!isTrialExpired && (
              <button
                onClick={() => setDismissed(true)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
