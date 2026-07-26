import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Card, CardContent, CardHeader, CardTitle, Label } from "@corely/ui";

export const DOCUMENT_ACCEPT = "image/*,.pdf,application/pdf";

export type ReceiptPickerProps = {
  active: boolean;
  label: string;
  inputId: string;
  file: File | null;
  setFile: (file: File | null) => void;
  chooseLabel: string;
  replaceLabel: string;
  takePictureLabel: string;
  noFileLabel: string;
  cameraTitle: string;
  cameraDescription: string;
  captureLabel: string;
  switchCameraLabel: string;
  cameraUnavailableLabel: string;
  cameraPermissionDeniedLabel: string;
  disabled: boolean;
};

export function ReceiptPicker(props: ReceiptPickerProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const {
    active,
    label,
    inputId,
    file,
    setFile,
    chooseLabel,
    replaceLabel,
    takePictureLabel,
    noFileLabel,
    cameraTitle,
    cameraDescription,
    captureLabel,
    switchCameraLabel,
    cameraUnavailableLabel,
    cameraPermissionDeniedLabel,
    disabled,
  } = props;

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      const stream = streamRef.current;
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(cameraUnavailableLabel);
      return;
    }
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraError(null);
    } catch {
      setCameraError(cameraPermissionDeniedLabel);
      setCameraOpen(false);
    }
  }, [cameraPermissionDeniedLabel, cameraUnavailableLabel, facingMode, stopCamera]);

  useEffect(() => {
    if (!active) {
      setCameraError(null);
      setCameraOpen(false);
    }
  }, [active]);

  useEffect(() => {
    if (cameraOpen) {
      void startCamera();
    } else {
      stopCamera();
    }
    return stopCamera;
  }, [cameraOpen, startCamera, stopCamera]);

  useEffect(() => {
    if (cameraOpen) {
      void startCamera();
    }
  }, [cameraOpen, facingMode, startCamera]);

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          return;
        }
        setFile(new File([blob], `receipt-${Date.now()}.jpg`, { type: "image/jpeg" }));
        stopCamera();
        setCameraOpen(false);
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          {file ? replaceLabel : chooseLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setCameraOpen(true)}
          disabled={disabled}
        >
          {takePictureLabel}
        </Button>
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {file?.name ?? noFileLabel}
        </span>
      </div>
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept={DOCUMENT_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const nextFile = event.target.files?.[0] ?? null;
          setFile(nextFile);
          event.currentTarget.value = "";
        }}
      />
      {cameraError ? <p className="text-xs text-destructive">{cameraError}</p> : null}
      {cameraOpen ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{cameraTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">{cameraDescription}</p>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-md bg-black"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={capturePhoto} disabled={disabled}>
                {captureLabel}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFacingMode((prev) => (prev === "user" ? "environment" : "user"))}
                disabled={disabled}
              >
                {switchCameraLabel}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setCameraOpen(false)}>
                {t("cash.ui.common.cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
