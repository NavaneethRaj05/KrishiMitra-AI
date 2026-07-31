import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sprout, MapPin, Compass, AlertTriangle, Lock, WifiOff } from 'lucide-react';
import { translate } from '../utils/translations';
import LanguageSelector from './LanguageSelector';

export default function LocationOverlay({ status, error, lang, onRetry, onLangChange }) {
  // Determine icon and colors based on status
  let IconComponent = Compass;
  let iconColorClass = "text-accent";
  let pulseColorClass = "bg-accent/15";
  let titleKey = "gps_required_title";
  let descKey = "gps_required_desc";
  let hintKey = null;

  if (status === 'loading') {
    IconComponent = Compass;
    iconColorClass = "text-accent animate-spin";
    pulseColorClass = "bg-accent/15";
    titleKey = "gps_checking";
    descKey = "gps_required_desc";
  } else if (status === 'denied') {
    IconComponent = Lock;
    iconColorClass = "text-danger";
    pulseColorClass = "bg-danger/15";
    titleKey = "gps_denied_title";
    descKey = "gps_denied_desc";
    hintKey = "gps_denied_hint";
  } else if (status === 'unavailable') {
    IconComponent = AlertTriangle;
    iconColorClass = "text-warning";
    pulseColorClass = "bg-warning/15";
    titleKey = "gps_unavailable_title";
    descKey = "gps_unavailable_desc";
    hintKey = "gps_unavailable_hint";
  } else if (status === 'timeout') {
    IconComponent = WifiOff;
    iconColorClass = "text-info";
    pulseColorClass = "bg-info/15";
    titleKey = "gps_timeout_title";
    descKey = "gps_timeout_desc";
    hintKey = "gps_timeout_hint";
  } else if (status === 'unsupported') {
    IconComponent = AlertTriangle;
    iconColorClass = "text-danger";
    pulseColorClass = "bg-danger/15";
    titleKey = "gps_unsupported_title";
    descKey = "gps_unsupported_desc";
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/85 backdrop-blur-md p-4">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="relative w-full max-w-md bg-bg-elevated/90 border border-border/80 rounded-3xl p-6 sm:p-8 flex flex-col shadow-2xl overflow-hidden search-glow"
        >
          {/* Subtle background glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

          {/* Top header with branding and language selector */}
          <div className="flex items-center justify-between mb-8 z-10 border-b border-border/40 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-accent-muted flex items-center justify-center">
                <Sprout size={16} className="text-accent" />
              </div>
              <span className="text-sm font-bold text-text-primary tracking-tight">KrishiMitraAI</span>
            </div>
            <LanguageSelector currentLang={lang} onChange={onLangChange} />
          </div>

          {/* Visual Indicator Section */}
          <div className="flex flex-col items-center text-center z-10">
            <div className="relative mb-6">
              {/* Outer pulsing ring */}
              <motion.div 
                animate={status === 'loading' ? {} : { scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className={`w-20 h-20 rounded-full ${pulseColorClass} flex items-center justify-center`}
              >
                <div className="w-14 h-14 rounded-full bg-bg flex items-center justify-center shadow-lg border border-border/40">
                  <IconComponent size={24} className={iconColorClass} />
                </div>
              </motion.div>
            </div>

            {/* Title & Desc */}
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-3 tracking-tight">
              {translate(lang, titleKey)}
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed mb-6 max-w-sm">
              {translate(lang, descKey)}
            </p>

            {/* Hint Alert Box */}
            {hintKey && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full text-left bg-bg/50 border border-border/40 rounded-2xl p-4 mb-6"
              >
                <div className="flex gap-2.5">
                  <div className="mt-0.5 text-accent-text text-sm">💡</div>
                  <div className="text-xs text-text-secondary leading-relaxed">
                    <strong className="text-text-primary font-semibold block mb-0.5">
                      {status === 'denied' ? 'How to unblock:' : 'Quick Fix:'}
                    </strong>
                    {translate(lang, hintKey)}
                  </div>
                </div>
              </motion.div>
            )}

            {/* CTA Button */}
            {status !== 'unsupported' && (
              <button
                onClick={onRetry}
                disabled={status === 'loading'}
                className="w-full bg-accent hover:bg-accent-hover text-bg font-semibold text-sm rounded-xl py-3.5 px-4 shadow-lg shadow-accent/20 active:scale-98 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
              >
                {status === 'loading' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-bg" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {translate(lang, 'gps_retrying_btn')}
                  </>
                ) : (
                  translate(lang, 'gps_retry_btn')
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
