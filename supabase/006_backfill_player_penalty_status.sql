update public.player_private
set penalty_status = 'no_show_warning'
where penalty_status = 'clear'
  and lower(trim(booking_reputation)) = '1x no-show';
