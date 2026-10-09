create or replace function public.admin_manage_bia_subscription(
  p_user_id text,
  p_status text default null,
  p_days integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_profile public.profiles%rowtype;
  current_expiration timestamptz;
  next_expiration timestamptz;
  next_status text;
  subscription_user_id text;
begin
  if nullif(trim(p_user_id), '') is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_user');
  end if;

  if p_days is not null and (p_days < 1 or p_days > 3650) then
    return jsonb_build_object('ok', false, 'reason', 'invalid_days');
  end if;

  if p_days is null and (p_status is null or p_status not in ('active', 'pending', 'expired')) then
    return jsonb_build_object('ok', false, 'reason', 'invalid_status');
  end if;

  select *
  into target_profile
  from public.profiles
  where role = 'student'
    and (id = p_user_id or auth_user_id = p_user_id)
  order by case when auth_user_id = p_user_id then 0 else 1 end
  limit 1
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'profile_not_found');
  end if;

  select subscription_expires_at, user_id
  into current_expiration, subscription_user_id
  from public.bia_subscription_profiles
  where lower(email) = lower(target_profile.email)
  for update;

  if p_days is not null then
    next_status := 'active';
    next_expiration := greatest(
      coalesce(current_expiration, target_profile.data_expiracao, now()),
      now()
    ) + make_interval(days => p_days);
  else
    next_status := p_status;
    if next_status = 'active' then
      next_expiration := greatest(
        coalesce(current_expiration, target_profile.data_expiracao, now()),
        now()
      );
      if next_expiration <= now() then
        next_expiration := now() + interval '30 days';
      end if;
    elsif next_status = 'pending' then
      next_expiration := null;
    else
      next_expiration := coalesce(current_expiration, target_profile.data_expiracao);
    end if;
  end if;

  subscription_user_id := coalesce(
    nullif(target_profile.auth_user_id, ''),
    nullif(subscription_user_id, ''),
    target_profile.id
  );

  insert into public.bia_subscription_profiles (
    email, user_id, status, subscription_expires_at, updated_at
  )
  values (
    lower(target_profile.email), subscription_user_id, next_status, next_expiration, now()
  )
  on conflict (email) do update
  set user_id = excluded.user_id,
      status = excluded.status,
      subscription_expires_at = excluded.subscription_expires_at,
      updated_at = excluded.updated_at;

  update public.profiles
  set status = next_status,
      data_expiracao = next_expiration,
      updated_at = now()
  where id = target_profile.id;

  return jsonb_build_object(
    'ok', true,
    'user_id', target_profile.id,
    'status', next_status,
    'subscription_expires_at', next_expiration
  );
end;
$$;

revoke all on function public.admin_manage_bia_subscription(text, text, integer) from public, anon, authenticated;
grant execute on function public.admin_manage_bia_subscription(text, text, integer) to service_role;
