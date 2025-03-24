import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import AvatarModal from "./AvatarModal";

interface ClickableAvatarProps {
  name: string;
  imageUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  fallbackClassName?: string;
}

const ClickableAvatar: React.FC<ClickableAvatarProps> = ({
  name,
  imageUrl,
  size = "md",
  className = "",
  fallbackClassName = "",
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Define sizes
  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-12 h-12 text-base",
  };

  // Only make clickable if there's an actual image
  const handleClick = () => {
    if (imageUrl) {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <Avatar
        className={`rounded-full bg-badminton flex items-center justify-center text-white overflow-hidden ${
          sizeClasses[size]
        } ${className} ${imageUrl ? "cursor-pointer" : ""}`}
        onClick={handleClick}
      >
        {imageUrl ? (
          <AvatarImage src={imageUrl} alt={name} />
        ) : (
          <AvatarFallback
            className={`bg-badminton text-white flex items-center justify-center w-full h-full ${fallbackClassName}`}
          >
            {name.charAt(0).toUpperCase() || "--"}
          </AvatarFallback>
        )}
      </Avatar>

      {imageUrl && (
        <AvatarModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          imageUrl={imageUrl}
          name={name}
        />
      )}
    </>
  );
};

export default ClickableAvatar;
