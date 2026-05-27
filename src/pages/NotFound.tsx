import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { SeoHead } from "@/components/SeoHead";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <SeoHead
        title="דף לא נמצא (404) — Daily Dominator"
        description="הדף שחיפשתם לא קיים או הוסר. חזרו לדף הבית של Daily Dominator כדי להמשיך לעקוב אחרי המשימות וההרגלים שלכם."
        path={location.pathname}
        noindex
      />
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">הדף לא נמצא</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          חזרה לדף הבית
        </a>
      </div>
    </div>
  );
};

export default NotFound;
