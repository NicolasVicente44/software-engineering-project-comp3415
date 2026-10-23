import { Navbar } from "@/components/navbar";

export default function CoursesView() {
    return (
    <div className="flex flex-1 flex-col">
        <Navbar/>
        <main className="mx-auto w-full max-w-4x1 flex-1 px-4 py-10">
            <h1 className="text-2xl font-semibold">My Courses</h1>
        </main>
    </div>
    );
}