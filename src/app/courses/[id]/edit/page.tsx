import { CourseForm } from "@/components/courses/course-form"
import { Navbar } from "@/components/navbar";
import { updateCourse} from "@/lib/courses/actions"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function EditCourse() {
    return (
        <div className="flex flex-1 flex-col">
            <Navbar />
            <main className="mx-auto w-full max-w-2xl px-4 py-10">
                <Card>
                    <CardHeader>
                        <CardTitle>Update Course</CardTitle>
                        <CardDescription>Update an existing Course on your profile.</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <CourseForm action={updateCourse}/>
                    </CardContent>
                </Card>
            </main>
       </div>
    );
}