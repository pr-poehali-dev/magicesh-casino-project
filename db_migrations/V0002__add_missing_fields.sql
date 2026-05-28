ALTER TABLE t_p5159120_magicesh_casino_proj.users
  ADD COLUMN IF NOT EXISTS email character varying(100),
  ADD COLUMN IF NOT EXISTS display_name character varying(50),
  ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now();

ALTER TABLE t_p5159120_magicesh_casino_proj.deposits
  ADD COLUMN IF NOT EXISTS phone character varying(20);

ALTER TABLE t_p5159120_magicesh_casino_proj.withdrawals
  ADD COLUMN IF NOT EXISTS rejected_reason text;
