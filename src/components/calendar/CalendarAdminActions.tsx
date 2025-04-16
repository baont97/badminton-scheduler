// src/components/Calendar/CalendarAdminActions.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UserPlus } from "lucide-react";
import { CalendarDay, Member } from "@/utils/schedulerUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CalendarAdminActionsProps {
  day: CalendarDay;
  members: Member[];
  onAddUser: (participantCount: number, userId: string) => Promise<void>;
}

export const CalendarAdminActions: React.FC<CalendarAdminActionsProps> = ({
  day,
  members,
  onAddUser,
}) => {
  const [selectedUser, setSelectedUser] = useState("");
  const [participantCount, setParticipantCount] = useState("1");
  const [isOpen, setIsOpen] = useState(false);

  const nonParticipatingMembers = members.filter(
    (member) => !day.members.includes(member.id)
  );

  const handleAddUser = async () => {
    if (!selectedUser) {
      return;
    }

    await onAddUser(parseInt(participantCount), selectedUser);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full border-badminton text-badminton hover:bg-badminton/10"
        >
          <UserPlus className="h-4 w-4 mr-1" /> Thêm người tham gia
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm người tham gia</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Chọn thành viên</Label>
            <Select
              value={selectedUser}
              onValueChange={(value) => setSelectedUser(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn thành viên" />
              </SelectTrigger>
              <SelectContent>
                {nonParticipatingMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Số lượng người</Label>
            <Input
              type="number"
              min="1"
              value={participantCount}
              onChange={(e) => setParticipantCount(e.target.value)}
              className="w-full h-9 px-3 border rounded-md"
            />
          </div>
          <Button
            className="w-full bg-badminton hover:bg-badminton/90"
            onClick={handleAddUser}
          >
            Thêm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
