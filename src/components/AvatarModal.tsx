import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  name: string;
}

const AvatarModal: React.FC<AvatarModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  name,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="text-center">{name}</DialogTitle>
        <div className="flex items-center justify-center p-6">
          <img
            src={imageUrl}
            alt={`${name}'s profile picture`}
            className="max-h-[80vh] max-w-full rounded-md object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AvatarModal;
