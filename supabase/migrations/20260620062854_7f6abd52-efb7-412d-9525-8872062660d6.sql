
-- ============================================================
-- Project collaboration: members, task comments, activity log,
-- granular RLS for tasks (hybrid: project membership + RACI).
-- ============================================================

-- 1. project_members --------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.project_member_role AS ENUM ('owner', 'editor', 'viewer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.project_member_role NOT NULL DEFAULT 'editor',
  added_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- 2. project_task_comments --------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.project_task_comments(task_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_task_comments TO authenticated;
GRANT ALL ON public.project_task_comments TO service_role;
ALTER TABLE public.project_task_comments ENABLE ROW LEVEL SECURITY;

-- 3. project_task_activity --------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_task_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_name text,
  action text NOT NULL,          -- 'created' | 'status_changed' | 'assigned' | 'updated' | 'commented'
  field text,                    -- e.g. 'status', 'assignee_id'
  old_value text,
  new_value text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_task_activity_task ON public.project_task_activity(task_id, created_at DESC);

GRANT SELECT, INSERT ON public.project_task_activity TO authenticated;
GRANT ALL ON public.project_task_activity TO service_role;
ALTER TABLE public.project_task_activity ENABLE ROW LEVEL SECURITY;

-- 4. Helper functions (SECURITY DEFINER, avoid RLS recursion) ---------
CREATE OR REPLACE FUNCTION public.is_project_member(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = _project_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_project_member_role(_project_id uuid, _user_id uuid)
RETURNS public.project_member_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.project_members
  WHERE project_id = _project_id AND user_id = _user_id
  LIMIT 1;
$$;

-- Hybrid permission: editor = project owner/editor OR org/system admin OR task RACI Responsible/Accountable.
CREATE OR REPLACE FUNCTION public.can_edit_project_task(_task_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _project_id uuid;
  _org_id uuid;
  _role public.project_member_role;
  _has_raci boolean;
BEGIN
  SELECT t.project_id, p.org_id INTO _project_id, _org_id
  FROM public.project_tasks t
  JOIN public.projects p ON p.id = t.project_id
  WHERE t.id = _task_id;

  IF _project_id IS NULL THEN RETURN false; END IF;

  -- System admin bypass
  IF public.has_role(_user_id, 'ADMIN'::app_role) THEN RETURN true; END IF;

  -- Org admin in same org
  IF public.has_role(_user_id, 'ORG_ADMIN'::app_role)
     AND _org_id = public.get_effective_org_id() THEN
    RETURN true;
  END IF;

  -- Project membership with edit rights
  _role := public.get_project_member_role(_project_id, _user_id);
  IF _role IN ('owner', 'editor') THEN RETURN true; END IF;

  -- RACI Responsible/Accountable on this task
  SELECT EXISTS (
    SELECT 1 FROM public.project_task_raci
    WHERE task_id = _task_id
      AND user_id = _user_id
      AND role IN ('R', 'A', 'Responsible', 'Accountable')
  ) INTO _has_raci;

  RETURN _has_raci;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_project(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _org_id uuid;
  _role public.project_member_role;
BEGIN
  SELECT org_id INTO _org_id FROM public.projects WHERE id = _project_id;
  IF _org_id IS NULL THEN RETURN false; END IF;
  IF public.has_role(_user_id, 'ADMIN'::app_role) THEN RETURN true; END IF;
  IF public.has_role(_user_id, 'ORG_ADMIN'::app_role)
     AND _org_id = public.get_effective_org_id() THEN RETURN true; END IF;
  _role := public.get_project_member_role(_project_id, _user_id);
  RETURN _role = 'owner';
END;
$$;

-- 5. RLS policies for new tables --------------------------------------
DROP POLICY IF EXISTS "members_select_org" ON public.project_members;
CREATE POLICY "members_select_org" ON public.project_members FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_members.project_id AND p.org_id = public.get_effective_org_id()));

DROP POLICY IF EXISTS "members_manage_owner_or_admin" ON public.project_members;
CREATE POLICY "members_manage_owner_or_admin" ON public.project_members FOR ALL TO authenticated
USING (public.can_manage_project(project_id, auth.uid()))
WITH CHECK (public.can_manage_project(project_id, auth.uid()));

DROP POLICY IF EXISTS "comments_select_org" ON public.project_task_comments;
CREATE POLICY "comments_select_org" ON public.project_task_comments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_task_comments.project_id AND p.org_id = public.get_effective_org_id()));

DROP POLICY IF EXISTS "comments_insert_self" ON public.project_task_comments;
CREATE POLICY "comments_insert_self" ON public.project_task_comments FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_task_comments.project_id AND p.org_id = public.get_effective_org_id())
);

DROP POLICY IF EXISTS "comments_update_own" ON public.project_task_comments;
CREATE POLICY "comments_update_own" ON public.project_task_comments FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "comments_delete_own_or_admin" ON public.project_task_comments;
CREATE POLICY "comments_delete_own_or_admin" ON public.project_task_comments FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.can_manage_project(project_id, auth.uid()));

DROP POLICY IF EXISTS "activity_select_org" ON public.project_task_activity;
CREATE POLICY "activity_select_org" ON public.project_task_activity FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_task_activity.project_id AND p.org_id = public.get_effective_org_id()));

DROP POLICY IF EXISTS "activity_insert_org" ON public.project_task_activity;
CREATE POLICY "activity_insert_org" ON public.project_task_activity FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_task_activity.project_id AND p.org_id = public.get_effective_org_id()));

-- 6. Refine project_tasks RLS -----------------------------------------
DROP POLICY IF EXISTS "Users can view tasks of projects in their org" ON public.project_tasks;
DROP POLICY IF EXISTS "Users can insert tasks of projects in their org" ON public.project_tasks;
DROP POLICY IF EXISTS "Users can update tasks of projects in their org" ON public.project_tasks;
DROP POLICY IF EXISTS "Users can delete tasks of projects in their org" ON public.project_tasks;

-- SELECT: any member of org can read tasks
CREATE POLICY "tasks_select_org" ON public.project_tasks FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.org_id = public.get_effective_org_id()));

-- INSERT: project editors/owners or admins
CREATE POLICY "tasks_insert_editor" ON public.project_tasks FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.org_id = public.get_effective_org_id())
  AND (
    public.has_role(auth.uid(), 'ADMIN'::app_role)
    OR public.has_role(auth.uid(), 'ORG_ADMIN'::app_role)
    OR public.get_project_member_role(project_tasks.project_id, auth.uid()) IN ('owner','editor')
    -- if there are no members yet, fall back to org membership (legacy projects)
    OR NOT EXISTS (SELECT 1 FROM public.project_members WHERE project_id = project_tasks.project_id)
  )
);

-- UPDATE: editors OR RACI R/A
CREATE POLICY "tasks_update_editor_or_raci" ON public.project_tasks FOR UPDATE TO authenticated
USING (public.can_edit_project_task(id, auth.uid())
       OR NOT EXISTS (SELECT 1 FROM public.project_members WHERE project_id = project_tasks.project_id))
WITH CHECK (public.can_edit_project_task(id, auth.uid())
       OR NOT EXISTS (SELECT 1 FROM public.project_members WHERE project_id = project_tasks.project_id));

-- DELETE: only project owners / admins
CREATE POLICY "tasks_delete_manager" ON public.project_tasks FOR DELETE TO authenticated
USING (public.can_manage_project(project_id, auth.uid())
       OR NOT EXISTS (SELECT 1 FROM public.project_members WHERE project_id = project_tasks.project_id));

-- 7. Trigger: auto-add project creator as owner -----------------------
CREATE OR REPLACE FUNCTION public.add_project_creator_as_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.project_members (project_id, user_id, role, added_by)
    VALUES (NEW.id, NEW.created_by, 'owner', NEW.created_by)
    ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;
  IF NEW.owner_id IS NOT NULL AND NEW.owner_id <> COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    INSERT INTO public.project_members (project_id, user_id, role, added_by)
    VALUES (NEW.id, NEW.owner_id, 'owner', NEW.created_by)
    ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_project_creator ON public.projects;
CREATE TRIGGER trg_add_project_creator
AFTER INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.add_project_creator_as_owner();

-- 8. updated_at triggers ----------------------------------------------
DROP TRIGGER IF EXISTS trg_project_members_updated ON public.project_members;
CREATE TRIGGER trg_project_members_updated BEFORE UPDATE ON public.project_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_task_comments_updated ON public.project_task_comments;
CREATE TRIGGER trg_task_comments_updated BEFORE UPDATE ON public.project_task_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Task change activity logger --------------------------------------
CREATE OR REPLACE FUNCTION public.log_project_task_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.project_task_activity (task_id, project_id, actor_id, action, new_value)
    VALUES (NEW.id, NEW.project_id, _actor, 'created', NEW.title);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.project_task_activity (task_id, project_id, actor_id, action, field, old_value, new_value)
      VALUES (NEW.id, NEW.project_id, _actor, 'status_changed', 'status', OLD.status, NEW.status);
    END IF;
    IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
      INSERT INTO public.project_task_activity (task_id, project_id, actor_id, action, field, old_value, new_value)
      VALUES (NEW.id, NEW.project_id, _actor, 'assigned', 'assignee_id', OLD.assignee_id::text, NEW.assignee_id::text);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_task_changes ON public.project_tasks;
CREATE TRIGGER trg_log_task_changes
AFTER INSERT OR UPDATE ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.log_project_task_changes();

-- 10. Backfill: existing projects → owner = created_by ---------------
INSERT INTO public.project_members (project_id, user_id, role, added_by)
SELECT id, created_by, 'owner', created_by FROM public.projects
WHERE created_by IS NOT NULL
ON CONFLICT (project_id, user_id) DO NOTHING;
