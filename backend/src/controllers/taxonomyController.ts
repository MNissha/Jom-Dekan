import type { Request, Response, NextFunction } from "express";
import { taxonomyService } from "../services/taxonomyService";

function ctxFrom(req: Request) {
  return {
    actorUserId: req.user!.id,
    actorRole: req.user!.role,
    requestId: req.requestId,
    ipAddress: req.ip,
  };
}

export const taxonomyController = {
  // ---- Universities ----
  async listUniversities(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await taxonomyService.universities.list();
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },
  async createUniversity(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await taxonomyService.universities.create(
        req.body,
        ctxFrom(req),
      );
      res.status(201).json({ message: "University created.", data });
    } catch (err) {
      next(err);
    }
  },
  // Any authenticated user (not just ADMIN) — the student/tutor-facing
  // "type a university that isn't in the list yet" path.
  async findOrCreateUniversity(req: Request, res: Response, next: NextFunction) {
    try {
      const { university, created } = await taxonomyService.universities.findOrCreate(
        req.body,
        ctxFrom(req),
      );
      res.status(created ? 201 : 200).json({
        message: created ? "University added." : "Matched an existing university.",
        data: university,
        created,
      });
    } catch (err) {
      next(err);
    }
  },
  async updateUniversity(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const data = await taxonomyService.universities.update(
        id,
        req.body,
        ctxFrom(req),
      );
      res.status(200).json({ message: "University updated.", data });
    } catch (err) {
      next(err);
    }
  },
  async setUniversityStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const { isActive } = req.body as { isActive: boolean };
      const data = await taxonomyService.universities.setActive(
        id,
        isActive,
        ctxFrom(req),
      );
      res.status(200).json({
        message: isActive ? "University restored." : "University archived.",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteUniversity(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      await taxonomyService.universities.remove(id, ctxFrom(req));
      res.status(200).json({ message: "University deleted." });
    } catch (err) {
      next(err);
    }
  },

  // ---- Faculties ----
  async listFaculties(req: Request, res: Response, next: NextFunction) {
    try {
      const { universityId } = req.query as { universityId: string };
      const data =
        await taxonomyService.faculties.listByUniversity(universityId);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },

  async createFaculty(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await taxonomyService.faculties.create(
        req.body,
        ctxFrom(req),
      );
      res.status(201).json({ message: "Faculty created.", data });
    } catch (err) {
      next(err);
    }
  },
  async updateFaculty(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const data = await taxonomyService.faculties.update(
        id,
        req.body,
        ctxFrom(req),
      );
      res.status(200).json({ message: "Faculty updated.", data });
    } catch (err) {
      next(err);
    }
  },
  async setFacultyStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const { isActive } = req.body as { isActive: boolean };
      const data = await taxonomyService.faculties.setActive(
        id,
        isActive,
        ctxFrom(req),
      );
      res.status(200).json({
        message: isActive ? "Faculty restored." : "Faculty archived.",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteFaculty(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      await taxonomyService.faculties.remove(id, ctxFrom(req));
      res.status(200).json({ message: "Faculty deleted." });
    } catch (err) {
      next(err);
    }
  },

  // ---- Programmes ----
  async listProgrammes(req: Request, res: Response, next: NextFunction) {
    try {
      const { facultyId } = req.query as { facultyId: string };
      const data = await taxonomyService.programmes.listByFaculty(facultyId);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },
  async createProgramme(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await taxonomyService.programmes.create(
        req.body,
        ctxFrom(req),
      );
      res.status(201).json({ message: "Programme created.", data });
    } catch (err) {
      next(err);
    }
  },
  async updateProgramme(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const data = await taxonomyService.programmes.update(
        id,
        req.body,
        ctxFrom(req),
      );
      res.status(200).json({ message: "Programme updated.", data });
    } catch (err) {
      next(err);
    }
  },
  async setProgrammeStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const { isActive } = req.body as { isActive: boolean };
      const data = await taxonomyService.programmes.setActive(
        id,
        isActive,
        ctxFrom(req),
      );
      res.status(200).json({
        message: isActive ? "Programme restored." : "Programme archived.",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteProgramme(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      await taxonomyService.programmes.remove(id, ctxFrom(req));
      res.status(200).json({ message: "Programme deleted." });
    } catch (err) {
      next(err);
    }
  },

  // ---- Subjects ----
  async listSubjects(req: Request, res: Response, next: NextFunction) {
    try {
      const { programmeId, universityId, search } = req.query as {
        programmeId?: string;
        universityId?: string;
        search?: string;
      };
      const data = programmeId
        ? await taxonomyService.subjects.listByProgramme(programmeId)
        : await taxonomyService.subjects.list({ universityId, search });
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },
  async createSubject(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await taxonomyService.subjects.create(
        req.body,
        ctxFrom(req),
      );
      res.status(201).json({ message: "Subject created.", data });
    } catch (err) {
      next(err);
    }
  },
  // Any authenticated user (not just ADMIN) — this is the student-facing
  // "type a subject that isn't in the list yet" path.
  async findOrCreateSubject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: programmeId } = req.params as { id: string };
      const { code, name, curriculumYear, recommendedSemester } =
        req.body as {
          code: string;
          name: string;
          curriculumYear?: number;
          recommendedSemester?: number;
        };
      const { subject, created } =
        await taxonomyService.subjects.findOrCreateForProgramme(
          { programmeId, code, name, curriculumYear, recommendedSemester },
          ctxFrom(req),
        );
      res.status(created ? 201 : 200).json({
        message: created
          ? "Subject added and linked to this programme."
          : "Matched an existing subject.",
        data: subject,
        created,
      });
    } catch (err) {
      next(err);
    }
  },
  // Same "any authenticated user" self-serve path as findOrCreateSubject,
  // but for contexts with no programme to attach to (e.g. the tutor
  // application form).
  async findOrCreateSubjectStandalone(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { code, name, universityId } = req.body as {
        code?: string;
        name: string;
        universityId: string;
      };
      const { subject, created } =
        await taxonomyService.subjects.findOrCreateStandalone(
          { code, name, universityId },
          ctxFrom(req),
        );
      res.status(created ? 201 : 200).json({
        message: created ? "Subject added." : "Matched an existing subject.",
        data: subject,
        created,
      });
    } catch (err) {
      next(err);
    }
  },
  async updateSubject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const data = await taxonomyService.subjects.update(
        id,
        req.body,
        ctxFrom(req),
      );
      res.status(200).json({ message: "Subject updated.", data });
    } catch (err) {
      next(err);
    }
  },
  async setSubjectStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const { isActive } = req.body as { isActive: boolean };
      const data = await taxonomyService.subjects.setActive(
        id,
        isActive,
        ctxFrom(req),
      );
      res.status(200).json({
        message: isActive ? "Subject restored." : "Subject archived.",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteSubject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      await taxonomyService.subjects.remove(id, ctxFrom(req));
      res.status(200).json({ message: "Subject deleted." });
    } catch (err) {
      next(err);
    }
  },

  // ---- Programme <-> Subject links ----
  async linkProgrammeSubject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: programmeId } = req.params as { id: string };
      const data = await taxonomyService.programmeSubjects.link(
        { programmeId, ...req.body },
        ctxFrom(req),
      );
      res.status(201).json({ message: "Subject linked to programme.", data });
    } catch (err) {
      next(err);
    }
  },
  async unlinkProgrammeSubject(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id: programmeId, subjectId } = req.params as {
        id: string;
        subjectId: string;
      };
      const data = await taxonomyService.programmeSubjects.unlink(
        programmeId,
        subjectId,
        ctxFrom(req),
      );
      res
        .status(200)
        .json({ message: "Subject unlinked from programme.", data });
    } catch (err) {
      next(err);
    }
  },

  // ---- Taxonomy requests ----
  async createTaxonomyRequest(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = await taxonomyService.requests.create(
        req.body,
        ctxFrom(req),
      );
      res.status(201).json({
        message: "Request submitted. An admin will review it shortly.",
        data,
      });
    } catch (err) {
      next(err);
    }
  },
  async listMyTaxonomyRequests(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = await taxonomyService.requests.listMine(ctxFrom(req));
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },
  async listPendingTaxonomyRequests(
    _req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = await taxonomyService.requests.listPending();
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },
  async reviewTaxonomyRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const { decision } = req.body as { decision: "APPROVED" | "REJECTED" };
      const data = await taxonomyService.requests.review(
        id,
        decision,
        ctxFrom(req),
      );
      res.status(200).json({
        message:
          decision === "APPROVED" ? "Request approved." : "Request rejected.",
        data,
      });
    } catch (err) {
      next(err);
    }
  },
};
