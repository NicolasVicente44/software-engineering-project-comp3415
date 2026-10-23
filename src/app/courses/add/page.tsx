import { CourseForm } from "@/components/courses/course-form"
import { Navbar } from "@/components/navbar";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AddCourse() {
    return (
        <div className="flex flex-1 flex-col">
            <Navbar />
            <main className="mx-auto w-full max-w-2xl px-4 py-10">
                <Card>
                    <CardHeader>
                        <CardTitle>Add a Course</CardTitle>
                        <CardDescription>Add a course to help build your GradPath</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <CourseForm/>
                    </CardContent>
                </Card>
            </main>
       </div>
    );
}