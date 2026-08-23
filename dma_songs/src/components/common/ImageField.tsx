import * as React from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/errors";

interface ImageFieldProps {
  value: string | null;
  onChange: (url: string | null) => void;
  bucket: "announcement-images" | "song-thumbnails" | "branding";
  id: string;
}

const MAX_BYTES = 5 * 1024 * 1024;

/** Upload to Supabase Storage, or paste an existing image address. */
export function ImageField({ value, onChange, bucket, id }: ImageFieldProps) {
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (file.size > MAX_BYTES) {
      toast.error("That image is over 5 MB. Choose a smaller file.");
      return;
    }
    setUploading(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Image uploaded");
    } catch (error) {
      toast.error(errorMessage(error, "The image didn't upload."));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative w-fit overflow-hidden rounded-md border border-border">
          <img src={value} alt="" className="h-32 w-auto object-cover" />
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute right-1 top-1 h-7 w-7"
            onClick={() => onChange(null)}
            aria-label="Remove image"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = "";
          }}
        />
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="animate-spin" aria-hidden /> : <ImagePlus aria-hidden />}
          {uploading ? "Uploading…" : "Upload image"}
        </Button>
        <Input
          value={value ?? ""}
          placeholder="…or paste an https:// image address"
          onChange={(event) => onChange(event.target.value || null)}
          className="max-w-sm flex-1"
          aria-label="Image address"
        />
      </div>
    </div>
  );
}
