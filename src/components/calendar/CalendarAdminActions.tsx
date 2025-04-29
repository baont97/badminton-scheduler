
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
import { toggleAttendance } from "@/utils/api/participantApi";
import { toast } from "sonner";

interface CalendarAdminActionsProps {
  day: CalendarDay;
  members?: Member[];
  onAddUser?: (participantCount: number, userId: string) => Promise<void>;
  onUpdateDay?: (day: CalendarDay) => void;
  setLoading?: (loading: boolean) => void;
}

export const CalendarAdminActions: React.FC<CalendarAdminActionsProps> = ({
  day,
  members = [],
  onAddUser,
  onUpdateDay,
  setLoading,
}) => {
  const [selectedUser, setSelectedUser] = useState("");
  const [participantCount, setParticipantCount] = useState("1");
  const [isOpen, setIsOpen] = useState(false);

  const nonParticipatingMembers = members.filter(
    (member) => !day.members.includes(member.id)
  );

  const handleAddUser = async () => {
    if (!selectedUser || !onUpdateDay || !setLoading) {
      return;
    }

    try {
      setLoading(true);
      
      // If a user is not already participating, add them
      const isParticipating = day.members.includes(selectedUser);
      const count = parseInt(participantCount);
      
      // We'll use the toggleAttendance function to add the user
      const result = await toggleAttendance(day.id, selectedUser, isParticipating, count);
      
      if (result.success) {
        // Update the day data
        onUpdateDay({
          ...day,
          members: isParticipating 
            ? day.members.filter(id => id !== selectedUser) 
            : [...day.members, selectedUser],
          slots: isParticipating
            ? day.slots.filter(slot => slot[0] !== selectedUser)
            : [...day.slots, [selectedUser, count]]
        });
        
        toast.success(`Đã thêm người tham gia thành công`);
        setIsOpen(false);
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error adding user:", error);
      toast.error("Có lỗi xảy ra khi thêm người tham gia");
    } finally {
      setLoading(false);
    }
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
