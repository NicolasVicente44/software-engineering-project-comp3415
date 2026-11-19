import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export type TermCourse = {
    code: string;
    name: string | null;
    credits: number;
    status: string;
    // true when the course just moved because of a status change (us-05)
    moved: boolean;
};

type TermCardProps = {
    term: number;
    courses: TermCourse[];
    creditLimit: number;
};

// rounded so sums like 0.1 + 0.2 display cleanly
const round = (value: number) => Number(value.toFixed(2));

const STATUS_BADGES: Record<string, { label: string; variant: "destructive" | "secondary" }> = {
    failed: { label: "Retake · failed", variant: "destructive" },
    dropped: { label: "Retake · dropped", variant: "secondary" },
};

// one term of the student's plan, with how full it is against their credit limit (us-04, us-05, us-06)
export function TermCard({ term, courses, creditLimit }: TermCardProps) {
    const used = round(courses.reduce((sum, course) => sum + course.credits, 0));
    const percent = Math.min(100, Math.round((used / creditLimit) * 100));

    return (
        <Card>
            <CardHeader className="gap-3">
                <div className="flex items-baseline justify-between gap-2">
                    <CardTitle>Term {term}</CardTitle>
                    <span className="text-xs text-muted-foreground tabular-nums">
                        {used} of {creditLimit} credits
                    </span>
                </div>
                <Progress
                    value={percent}
                    aria-label={`Term ${term} credits used`}
                    className={
                        used > creditLimit
                            ? "[&_[data-slot=progress-indicator]]:bg-destructive"
                            : "[&_[data-slot=progress-indicator]]:bg-primary/40"
                    }
                />
            </CardHeader>
            <CardContent>
                {courses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No courses this term.</p>
                ) : (
                    <ul className="flex flex-col divide-y">
                        {courses.map((course) => {
                            const statusBadge = STATUS_BADGES[course.status];

                            return (
                                <li key={course.code} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                                    <div className="min-w-0">
                                        <p className="font-medium">{course.code}</p>
                                        {course.name && (
                                            <p className="truncate text-xs text-muted-foreground">{course.name}</p>
                                        )}
                                        {(statusBadge || course.moved) && (
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {statusBadge && (
                                                    <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                                                )}
                                                {course.moved && <Badge variant="outline">Moved</Badge>}
                                            </div>
                                        )}
                                    </div>
                                    <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                                        {course.credits} cr
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
