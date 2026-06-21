
REVOKE EXECUTE ON FUNCTION public.admin_get_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_signups_daily() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_activity_daily() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_signups_daily() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_activity_daily() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
