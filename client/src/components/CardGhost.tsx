import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Component({ num = 2 }: { num?: number }) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2">
          <div className="h-6 w-6 rounded bg-gray-200 animate-pulse" />
          <div className="h-6 w-32 rounded bg-gray-200 animate-pulse" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: num }, (_, index) => (
          <Card key={index} className="overflow-hidden">
            <div className="p-4 space-y-4">
              <div className="flex justify-between">
                <div className="h-5 w-24 rounded bg-gray-200 animate-pulse" />
                <div className="h-5 w-24 rounded bg-gray-200 animate-pulse" />
              </div>
              <div className="flex justify-between">
                <div className="h-7 w-28 rounded bg-gray-200 animate-pulse" />
                <div className="h-7 w-28 rounded bg-gray-200 animate-pulse" />
              </div>
              <div className="flex justify-between items-center">
                <div className="h-5 w-28 rounded bg-gray-200 animate-pulse" />
                <div className="flex space-x-2">
                  <div className="h-5 w-12 rounded bg-gray-200 animate-pulse" />
                  <div className="h-5 w-5 rounded bg-gray-200 animate-pulse" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
