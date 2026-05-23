import { useState, useEffect, useRef } from 'react';

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export const useVoiceInput = (onResultCallback?: (resultText: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check browser compatibility
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Browser Anda tidak mendukung Input Suara.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false; // Stop listening when user stops speaking
    rec.interimResults = true; // Show results in real time
    rec.lang = 'id-ID'; // Indonesian voice processing

    rec.onstart = () => {
      setIsListening(true);
      setError(null);
      setTranscript('');
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', e.error);
      setIsListening(false);
      if (e.error === 'not-allowed') {
        setError('Akses mikrofon ditolak. Izinkan mikrofon di pengaturan browser Anda.');
      } else if (e.error === 'no-speech') {
        setError('Tidak ada suara terdeteksi. Silakan coba bicara lagi.');
      } else {
        setError(`Kesalahan Input Suara: ${e.error}`);
      }
    };

    rec.onend = () => {
      setIsListening(false);
    };

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript);
        if (onResultCallback) {
          onResultCallback(finalTranscript);
        }
      }
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onResultCallback]);

  const startListening = () => {
    setError(null);
    setTranscript('');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    } else {
      setError('Input suara tidak tersedia di browser ini.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error('Failed to stop speech recognition:', err);
      }
    }
  };

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    setError
  };
};
