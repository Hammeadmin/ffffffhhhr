ALTER TABLE public.calendar_events
ADD COLUMN assigned_to_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
