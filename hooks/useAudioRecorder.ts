import { useRef, useState, useCallback } from 'react';
import { AudioBlock } from '../types';

export const useAudioRecorder = (onRecordingComplete: (block: AudioBlock) => void) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = event => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onerror = () => {
          console.error('Failed to read audio recording.');
        };
        reader.onload = (e) => {
          const newAudioBlock: AudioBlock = {
            id: `audio-${Date.now()}`,
            type: 'audio',
            src: e.target?.result as string,
          };
          onRecordingComplete(newAudioBlock);
        };
        reader.readAsDataURL(audioBlob);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err instanceof Error ? err.message : err);
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  return { isRecording, startRecording, stopRecording };
};
