import type { Request, Response, NextFunction } from "express";
import { taxonomyService } from "../services/taxonomyService";

function ctxFrom(req: Request) {
  return {
    actorUserId: req.user!.id,
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

  // ---- Subjects ----
  async listSubjects(req: Request, res: Response, next: NextFunction) {
    try {
      const { programmeId } = req.query as { programmeId?: string };
      const data = programmeId
        ? await taxonomyService.subjects.listByProgramme(programmeId)
        : await taxonomyService.subjects.list();
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
};
