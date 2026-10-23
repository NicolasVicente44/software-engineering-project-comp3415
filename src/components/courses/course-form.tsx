import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CourseForm() {
    return (
        <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <Label htmlFor="course_name">Course Name</Label>
                <Input id="course_name" name="course_name" type="text" required placeholder="Software Engineering"/>
            </div>
            <div className="flex flex-col gap-2">
                <Label htmlFor="course_code">Course Code</Label>
                <Input id="course_code" name="course_code" type="text" required placeholder="COMP-3415"/>
            </div>
            <div className="flex flex-col gap-2">
                <Label htmlFor="credits">Credits</Label>
                <Input id="credits" name="credits" type="number" required placeholder="0.5" min="0" step="0.01"/>
            </div>
            <div className="flex flex-col gap-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" required>
                    <SelectTrigger id="status" className="w-full">
                        <SelectValue placeholder="Choose a status"/>
                    </SelectTrigger>

                    <SelectContent>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="dropped">Dropped</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button type="submit" className="w-full">Add Course</Button>
        </form>
    );
}
