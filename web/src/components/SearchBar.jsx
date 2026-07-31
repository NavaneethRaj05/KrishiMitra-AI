import { useState, useRef, useEffect } from 'react';
import { Search, ArrowUp, Camera, Mic, Sparkles, MicOff } from 'lucide-react';
import { translate } from '../utils/translations';
import { transcribeVoice } from '../api/queryRouter';

export default function SearchBar({ onSubmit, lang, isLoading, isCompact = false, value, onChange, geocodedLocation, attachedFile, onAttachedFileChange }) {
  const [localQuery, setLocalQuery] = useState('');
  const isControlled = value !== undefined && onChange !== undefined;
  
  const query = isControlled ? value : localQuery;
  const setQuery = isControlled ? onChange : setLocalQuery;

  const [localImage, setLocalImage] = useState(null);
  const isImageControlled = attachedFile !== undefined && onAttachedFileChange !== undefined;
  const selectedImage = isImageControlled ? attachedFile : localImage;
  const setSelectedImage = isImageControlled ? onAttachedFileChange : setLocalImage;
  const fileInputRef = useRef(null);

  // ── Voice Recording State ──
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    audioChunksRef.current = [];
    setRecordingTime(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks on the stream to release the mic
        stream.getTracks().forEach(track => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 1000) {
          await handleTranscribe(audioBlob);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting voice recording:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleTranscribe = async (audioBlob) => {
    setIsTranscribing(true);
    setQuery(translate(lang, 'processing') || 'Transcribing...');
    try {
      const res = await transcribeVoice(audioBlob, lang);
      if (res && res.success && res.data.text) {
        setQuery(res.data.text);
      } else if (res && res.text) {
        setQuery(res.text);
      } else {
        setQuery('');
      }
    } catch (err) {
      console.error('Transcription error:', err);
      setQuery('Error transcribing audio.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (!trimmed && !selectedImage) return;
    
    const mode = selectedImage 
      ? 'image' 
      : (trimmed.toLowerCase().match(/n\s*=\s*\d/i) ? 'soil' : 'text');
    
    onSubmit({ query: trimmed, mode, attachedFile: selectedImage });
    setQuery('');
    setSelectedImage(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedImage(file);
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getImageUrl = () => {
    if (!selectedImage) return '';
    if (selectedImage instanceof Blob || selectedImage instanceof File) {
      try {
        return URL.createObjectURL(selectedImage);
      } catch (e) {
        return '';
      }
    }
    return selectedImage; // It's already a string URL (e.g. from revert)
  };

  return (
    <div className={`w-full ${isCompact ? 'max-w-3xl' : 'max-w-2xl'} mx-auto`}>
      <div className={`relative search-glow rounded-2xl bg-bg-input border overflow-hidden transition-all ${
        isRecording 
          ? 'border-accent ring-2 ring-accent/15 animate-pulse' 
          : 'border-border'
      }`}>
        {/* Image preview */}
        {selectedImage && (
          <div className="px-4 pt-3 pb-1 flex items-center gap-2">
            <div className="relative">
              <img 
                src={getImageUrl()} 
                alt="Attached leaf" 
                className="h-12 w-12 object-cover rounded-lg border border-border"
              />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-danger rounded-full text-white text-[9px] flex items-center justify-center font-bold hover:bg-red-400"
              >
                ×
              </button>
            </div>
            <span className="text-xs text-text-tertiary">🍂 Leaf image attached for disease diagnosis</span>
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2 px-4 py-3">
          <textarea
            value={
              isRecording 
                ? `🎤 Recording Audio... (${formatDuration(recordingTime)}) — Click mic again to stop` 
                : query
            }
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={translate(lang, 'search_placeholder')}
            rows={isCompact ? 1 : 2}
            className="flex-1 bg-transparent text-text-primary placeholder-text-tertiary text-sm leading-relaxed resize-none focus:outline-none min-h-[24px] max-h-[120px]"
            disabled={isLoading || isRecording || isTranscribing}
          />
        </div>

        {/* Bottom action row */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-1.5">
            {/* Attach image */}
            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-bg-hover transition-colors"
              title="Attach leaf image"
              disabled={isRecording || isTranscribing}
            >
              <Camera size={16} />
            </button>
            
            {/* Voice */}
            <button
              onClick={toggleRecording}
              className={`p-1.5 rounded-lg transition-colors ${
                isRecording 
                  ? 'text-accent bg-accent-muted hover:bg-accent/25' 
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-hover'
              }`}
              title={isRecording ? "Stop Recording" : "Voice input"}
              type="button"
              disabled={isTranscribing}
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            {!isCompact && (
              <span className="text-[11px] text-text-tertiary ml-2 hidden sm:inline flex items-center gap-1">
                <Sparkles size={11} className="inline mr-0.5 text-accent animate-pulse" />
                {geocodedLocation ? (
                  <span>📍 Location: <strong className="text-accent">{geocodedLocation.district || 'Local'}, {geocodedLocation.state || 'Local'}</strong></span>
                ) : (
                  translate(lang, 'search_hint')
                )}
              </span>
            )}
          </div>
          
          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={(!query.trim() && !selectedImage) || isLoading || isRecording || isTranscribing}
            className="p-2 rounded-xl bg-accent text-bg hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
          >
            <ArrowUp size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Enter hint */}
      {!isCompact && (
        <p className="text-center text-[11px] text-text-tertiary mt-2.5 opacity-60">
          Press <kbd className="px-1 py-0.5 bg-bg-elevated rounded text-[10px] border border-border">Enter</kbd> to search
        </p>
      )}
    </div>
  );
}
