begin;

alter table public.bia_trial_coupons
  alter column days set default 2;

update public.bia_trial_coupons
set days = 2,
    notes = regexp_replace(notes, '5 dias', '2 dias', 'gi')
where is_used = false;

update public.bia_trial_coupons
set is_used = true,
    used_at = now(),
    notes = 'Cupom público antigo desativado; gere cupons individuais pelo Painel do CEO.'
where id in ('coupon_default_1', 'coupon_default_2', 'coupon_default_3')
  and is_used = false;

update public.bia_trial_coupons
set is_used = true,
    used_at = now(),
    notes = 'Cupom antigo de código curto desativado por segurança; gere um novo no Painel do CEO.'
where is_used = false
  and code ~ '^BIA-TRIAL-[A-Z0-9]{4}$';

drop function if exists public.redeem_trial_coupon(text, text);

create or replace function public.redeem_google_trial_coupon(p_code text, p_email text, p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  redeemed_coupon public.bia_trial_coupons;
  target_profile public.profiles%rowtype;
  expiration timestamptz;
begin
  select * into target_profile
  from public.profiles
  where lower(email) = lower(trim(p_email))
    and auth_user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'profile_not_found');
  end if;

  if nullif(trim(target_profile.cupom_usado), '') is not null then
    return jsonb_build_object('ok', false, 'reason', 'trial_already_used');
  end if;

  update public.bia_trial_coupons
  set is_used = true,
      used_by_email = lower(trim(p_email)),
      used_at = now()
  where upper(code) = upper(trim(p_code))
    and is_used = false
    and (expires_at is null or expires_at > now())
  returning * into redeemed_coupon;

  if redeemed_coupon.id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_or_used');
  end if;

  select greatest(coalesce(subscription_expires_at, now()), now())
  into expiration
  from public.bia_subscription_profiles
  where lower(email) = lower(trim(p_email))
  for update;

  expiration := expiration + interval '2 days';

  update public.profiles
  set status = 'active',
      data_expiracao = expiration,
      cupom_usado = redeemed_coupon.code,
      updated_at = now()
  where lower(email) = lower(trim(p_email))
    and auth_user_id = p_user_id;

  insert into public.bia_subscription_profiles (email, user_id, status, subscription_expires_at, updated_at)
  values (lower(trim(p_email)), p_user_id, 'active', expiration, now())
  on conflict (email) do update
  set user_id = excluded.user_id,
      status = 'active',
      subscription_expires_at = excluded.subscription_expires_at,
      updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'coupon', jsonb_build_object('code', redeemed_coupon.code, 'days', 2),
    'expires_at', expiration
  );
end;
$$;

revoke all on function public.redeem_google_trial_coupon(text, text, text) from public, anon, authenticated;
grant execute on function public.redeem_google_trial_coupon(text, text, text) to service_role;
revoke all on function public.check_trial_coupon(text) from public, anon, authenticated;
grant execute on function public.check_trial_coupon(text) to service_role;

commit;
