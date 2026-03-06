import { useState, useRef, useCallback } from "react";
import { Camera, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import Cropper, { Area } from "react-easy-crop";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AvatarUploadProps {
  avatarUrl: string | null;
  displayName: string | null;
  userId: string;
  onUploaded: (url: string | null) => void;
}

const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED = "image/jpeg,image/png,image/webp";

async function getCroppedBlob(imageSrc: string, crop: Area): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const size = 512;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, size, size);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Canvas error"))), "image/jpeg", 0.9);
  });
}

export function AvatarUpload({ avatarUrl, displayName, userId, onUploaded }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  const initials = (displayName ?? "U").slice(0, 2).toUpperCase();

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedArea(croppedPixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_SIZE) { toast.error("Arquivo muito grande. Máximo: 5 MB."); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) { toast.error("Formato inválido. Use JPEG, PNG ou WebP."); return; }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setDialogOpen(true);
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const confirmUpload = async () => {
    if (!imageSrc || !croppedArea) return;
    setUploading(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedArea);
      const path = `${userId}/avatar.jpg`;

      const { data: existing } = await supabase.storage.from("avatars").list(userId);
      if (existing?.length) {
        await supabase.storage.from("avatars").remove(existing.map((f) => `${userId}/${f.name}`));
      }

      const { error } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (error) throw error;

      const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
      onUploaded(`${publicUrl.publicUrl}?t=${Date.now()}`);
      toast.success("Foto atualizada!");
    } catch {
      toast.error("Erro ao enviar a foto.");
    } finally {
      setUploading(false);
      closeDialog();
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setImageSrc(null);
    setCroppedArea(null);
  };

  const handleRemove = async () => {
    try {
      const { data: existing } = await supabase.storage.from("avatars").list(userId);
      if (existing?.length) {
        await supabase.storage.from("avatars").remove(existing.map((f) => `${userId}/${f.name}`));
      }
      onUploaded(null);
      toast.success("Foto removida!");
    } catch {
      toast.error("Erro ao remover a foto.");
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-16 w-16 border-2 border-primary/20">
        {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" />}
        <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex flex-col gap-2">
        <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleFileChange} />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => inputRef.current?.click()}>
            <Camera className="w-4 h-4" />
            {avatarUrl ? "Alterar foto" : "Enviar foto"}
          </Button>
          {avatarUrl && (
            <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" onClick={handleRemove}>
              <Trash2 className="w-4 h-4" />
              Remover
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP • Máx. 5 MB</p>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar foto</DialogTitle>
          </DialogHeader>

          <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>

          <div className="flex items-center gap-3 px-1">
            <ZoomOut className="w-4 h-4 text-muted-foreground shrink-0" />
            <Slider
              min={1}
              max={3}
              step={0.05}
              value={[zoom]}
              onValueChange={([v]) => setZoom(v)}
              className="flex-1"
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={confirmUpload} disabled={uploading}>
              {uploading ? "Enviando..." : "Aplicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
