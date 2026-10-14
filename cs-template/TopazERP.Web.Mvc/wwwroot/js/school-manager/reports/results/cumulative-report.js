const app = Vue.createApp({
    data() {
        return {
            assignments: [],
            flatAssignments: [],
            isLoading: false,
            schClasses: [],
            academicYearId: '',
            termId: '',
            classId: '',
            uploadFile: null,
            academicYears: [],
            classes: [],
            subjects: [],
            academicYearName: '',
            termName: '',
            className: '',
            subjectId: '',
            subjectName: '',
            assignmentNumber: 1,
            overallMark: 0,
            assignmentDate: '',
            assignmentNo: '',
            classSubjects: [],
            mainClasses: [],
            streams: [],
            mainSubjects: [],
            terms: [],
            students: [],
            tableData: [],
            allAssignments: [],
            reportTitle: '',
            header: [],
            assignmentHeaders: [],
            assignmentOverallMarks: {},
            currentDate: new Date().toLocaleDateString(),
            currentPage: 1,
            totalPages: 0,
            teachers: [],
            teacherSubjects: [],
            teacherClasses: [],
            classLevelPercentages: [],
            remarks: [],
            attendance: [],
            conduct: [],
            attitude: [],
            allLevels: [],
            schoolProfile: [],
            schoolDays: 0,
            classTeacherRemarks: [],
            academicYearTerm: [],
            termDetails: [],
            classPercentage: 0,
            examPercentage: 0,
            classPromotions: [],
            reportType: "1",
            classStudents: [],
            terminalReport: [],
            stageRemarks: [],
            pageNumber: 1,
            pageBreakCount: 1,
            termBeginDate: new Date().toLocaleDateString(),
            reportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1772539981/erp-reports/school-manager/cumulative-report_zf9iaq.rdl',
        }
    },
    mounted() {
        this.loadDropdowns();
        this.loadAllAssignments();
        this.reportApiBaseUrl = reportApiBaseUrl;
    },
    methods: {
    
        loadAllAssignments() {
            axios.get('/SmReports/GetAllResults', {}).then(res => {
                this.allAssignments = res.data || [];

            });
        },
        formatDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");
        },
        loadDropdowns() {
            axios.all([
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`),
                axios.get('/SmDataEntry/GetAllAssignedSubjects/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmMainSetups/ListAllSubjects/'),
                axios.get('/SmStudentSetups/ListAllStudents/'),
                axios.get('/SmReports/GetReportHeader/'),
                axios.get('/SmStaffSetups/ListAllTeacherSubjects/'),
                axios.get('/SmStaffSetups/ListAllStaffBios/'),
                axios.get('/SmDataEntry/GetAllClassLevelPercentages/'),
                axios.get('/SmDataEntry/GetAllSubjectRemarks/'),
                axios.get('/SmResultsPromotions/GetAllAttendance/'),
                axios.get('/SmResultsPromotions/GetAllBAssessments/'),
                axios.get('/SmMainSetups/ListAllLevels/'),
                axios.get('/SmMainSetups/GetSchoolProfile/'),
                axios.get('/SmResultsPromotions/GetAllRemarks'),
                axios.get('/SmMainSetups/ListAllAcademicYearTerms/'),
                axios.get('/SmMainSetups/ListAllAcademicYearTermDetails/'),
                axios.get('/SmDataEntry/GetAllClassPromotions/'),
                axios.get('/SmDataEntry/GetAllRegisteredClasses/'),

            ]).then(axios.spread((years, classes, terms, subjects, mainClasses, streams, mainSubjects, students, header, teacherSubjects, teachers, percentages, remarks, attendance, assessments, levels, profile, teacherRemarks,
                                  yearTerms, termDetails, classPromotions, teacherClasses) => {

                this.academicYears = years.data;
                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                this.header = header.data;
                this.terms = terms.data;
                this.mainSubjects = mainSubjects.data;
                this.teachers = teachers.data;
                this.teachers.forEach(t => {
                    t.fullName = `${t.firstName} ${t.lastName}`
                });
                this.subjects = subjects.data;
                this.students = students.data.filter(s => !s.isAlumni);
                this.students.forEach(s => {
                    s.name = this.formatStudentName(s);
                });
                this.students.sort((a, b) => a.lastName.localeCompare(b.lastName));
                this.subjectTeachers = teacherSubjects.data;
                this.classLevelPercentages = percentages.data;
                this.remarks = remarks.data;
                this.attendance = attendance.data;
                this.conduct = assessments.data.filter(a => a.assessmentType === 'Conduct');
                this.attitude = assessments.data.filter(a => a.assessmentType === 'Attitude');
                this.allLevels = levels.data;
                this.schoolProfile = profile.data;
                this.classTeacherRemarks = teacherRemarks.data;
                this.academicYearTerm = yearTerms.data;
                this.termDetails = termDetails.data;
                this.classPromotions = classPromotions.data;
                this.teacherClasses = teacherClasses.data;
                this.initDropdowns();
            }));
        },

        getTeachersByClass(classId) {
            const regClass = this.teacherClasses
                .find(c => String(c.classId) === String(classId));

            if (!regClass) return [];

            return [
                regClass.mainTeacherId,
                regClass.subTeacherId
            ].filter(Boolean);
        },
        getSubjectName(subjectId) {
            return this.mainSubjects.find(s => s.id === subjectId)?.abbreviation || '';
        },
        subjectsBySelection() {
            if (!this.academicYearId || !this.termId || !this.classId) {
                this.classSubjects = [];
                this.refreshSubjectDropdown([]);
                return;
            }
            const match = this.subjects.find(s =>
                s.academicYearId === this.academicYearId &&
                s.termId === this.termId &&
                s.classId === this.classId
            );
            const subjects = match
                ? match.details.map(d => ({
                    id: d.subjectId,
                    name: this.getSubjectName(d.subjectId)
                }))
                : [];
            this.classSubjects = subjects;
            this.refreshSubjectDropdown(subjects);
        },
        refreshSubjectDropdown(data) {
            const ddl = $('#subjectId').data('ejDropDownList');
            if (ddl) {
                ddl.option({
                    dataSource: data,
                    value: null
                });
            }
        },
        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
        },
        getLevelName(levelId) {
            return this.allLevels.find(c => c.actualLevelId === levelId)?.actualLevelName || '';
        },
        getClassStudents(classId) {
            this.classStudents = this.students.filter(s => s.classId === classId);
            this.classStudents.sort((a, b) => a.lastName.localeCompare(b.lastName));
            return this.classStudents;

        },
        initDropdowns() {
            this.assignmentDate = new Date().toISOString().substr(0, 10);
            const activeYear = this.academicYears.find(y => y.isActive === true);
            $('#academicYearId').ejDropDownList({
                dataSource: this.academicYears,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.academicYearId = args.value;
                },
                value: activeYear ? activeYear.id : null
            });
            if (activeYear) {
                this.academicYearId = activeYear.id;
            }
            const levelClassDropdown = this.classes.map(c => ({
                id: c.id, // levelClassId
                name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
            }));
            levelClassDropdown.sort((a, b) => a.name.localeCompare(b.name));
            $('#classId').ejDropDownList({
                dataSource: levelClassDropdown,
                width: "100%",
                watermarkText: "Select Source Class...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.classId = args.value;
                    this.getClassStudents(args.value);
                    this.searchReport();
                }
            });
            $('#termId').ejDropDownList({
                dataSource: this.terms,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.termId = args.value;
                   
                }
            });
           
        },
        formatStudentName(student) {
            return [student.lastName, student.firstName, student.otherName]
                .filter(n => n && n.trim() !== '')
                .join(' ');
        },
        getSubjectRemark(totalScore, stage) {
            return this.remarks.find(r =>
                r.stage === stage &&
                totalScore >= r.minMark &&
                totalScore <= r.maxMark
            ) || null;

        },
        getStageSubjectRemarks(stage) {
            const stageRemarks = this.remarks.filter(r => r.stage === stage);
            stageRemarks.forEach(r => {
                r.name = `${r.minMark} - ${r.maxMark} - ${r.gradeNumber} - ${r.remark}`
            })
            return stageRemarks;
        },
        getAttendance(studentId) {
            const record = this.attendance.find(a =>
                String(a.academicYearId) === String(this.academicYearId) &&
                String(a.classId) === String(this.classId) &&
                String(a.termId) === String(this.termId) &&
                String(a.studentId) === String(studentId)
            );
            return record ? record.days : 0;
        },

        getBehaviouralRemark(type, studentId) {

            const source = type === 'Conduct'
                ? this.conduct
                : this.attitude;

            const record = source.find(b =>
                String(b.classId) === String(this.classId) &&
                String(b.academicYearId) === String(this.academicYearId) &&
                String(b.termId) === String(this.termId) &&
                b.assessmentType === type
            );

            if (!record || !record.assessments) return '';

            const studentAssessment = record.assessments.find(a =>
                a.studentId === studentId
            );

            return studentAssessment ? studentAssessment.description : '';
        },


        getClassTeacherRemark(studentId, classId) {
            const source = this.classTeacherRemarks.filter(r => r.remarkType === 'Overall' && r.teacherType === 'Class');
            const record = source.find(b =>
                String(b.classId) === String(classId) &&
                String(b.studentId) === String(studentId) &&
                String(b.academicYearId) === String(this.academicYearId)
            )

            return record ? record.remark : '';

        },
        getHeadTeacherRemark(studentId, classId) {
            const source = this.classTeacherRemarks.filter(r => r.remarkType === 'Overall' && r.teacherType === 'Head');
            const record = source.find(b =>
                String(b.classId) === String(classId) &&
                String(b.studentId) === String(studentId) &&
                String(b.academicYearId) === String(this.academicYearId)
            )

            return record ? record.remark : '';
        },

        searchReport() {
            if (!this.classId || !this.academicYearId || !this.termId ) {
                this.toastHandler(
                    'warning',
                    'Please select Class, Academic Year and Term to generate report.'
                );
                return;
            }
            /* ===============================
               BASIC METADATA
            =============================== */
            const classInfo = this.classes.find(c => String(c.id) === String(this.classId)) || {};
            const mainClassId = classInfo.classId; // main class
            const className = `${this.getMainClassName(classInfo.classId)} ${this.getStreamName(classInfo.streamId)}`.trim();
            const levelId = classInfo.levelId;
            const levelInfo = this.allLevels.find(l => String(l.id) === String(levelId)) || {};
            const actualLevelId = levelInfo.actualLevelId;
            const levelName = this.getLevelName(actualLevelId);
            const stage = levelName?.toUpperCase().includes('JHS') ? 'JHS' : 'Primary';

            const academicYearName = this.academicYears.find(y => String(y.id) === String(this.academicYearId))?.name || '';
            const term = this.terms.find(t => String(t.id) === String(this.termId)) || {};
            const termName = term.name || '';
            const yearTerm = this.academicYearTerm.find(y => String(y.academicYearId) === String(this.academicYearId) && String(y.termId) === String(this.termId));
            const endTermDate = yearTerm ? this.normalizeDate(yearTerm.endDate) : '';
          
            
            const classTeacher = this.teacherClasses.find(s => s.classId === this.classId)?.mainTeacherId;
            const teacherName = this.teachers.find(t => String(t.id) === String(classTeacher))?.fullName || '';

            this.reportTitle = 'Cumulative Report';
            const schoolDays = this.schoolProfile.schoolDays;
            const classSubjects = this.subjects.filter(s => s.classId === this.classId && s.academicYearId === this.academicYearId && s.termId === this.termId);
            const subjectIds = [
                ...new Set(
                    classSubjects.flatMap(cs =>
                        (cs.details || []).map(d => d.subjectId)
                    )
                )
            ];
            console.log(subjectIds);

            /* ===============================
               GET CLASS / EXAM PERCENTAGES
            =============================== */
            const yearPercentages = this.classLevelPercentages.find(y => y.academicYearId === this.academicYearId);
            let classPercentage = 0, examPercentage = 0;

            if (yearPercentages && yearPercentages.details) {
                const levelMatch = yearPercentages.details.find(d => d.levelId === levelId);
                if (levelMatch) {
                    classPercentage = levelMatch.classPercentage;
                    examPercentage = levelMatch.examPercentage;
                }
            }

            this.classPercentage = classPercentage;
            this.examPercentage = examPercentage;


            //classPromotion
            const classPromotion = this.classPromotions.find(p => p.fromClassId === this.classId);
            let termBeginDate = '';
            let promotedClassName = '';
            if (classPromotion) {
                termBeginDate = this.normalizeDate(classPromotion.startDate);

                if (classPromotion.toClassId) {
                    const toClassInfo = this.classes.find(c => String(c.id) === String(classPromotion.toClassId)) || {};
                    promotedClassName = `${this.getMainClassName(toClassInfo.classId)} ${this.getStreamName(toClassInfo.streamId)}`.trim();
                }
            }
            /* ===============================
               FILTER ASSIGNMENTS FOR CLASS + TERM + YEAR
            =============================== */
            const filteredData = this.allAssignments.filter(a =>
                String(a.classId) === String(this.classId) &&
                String(a.academicYearId) === String(this.academicYearId) &&
                String(a.termId) === String(this.termId)
            );

            if (!filteredData.length) {
                this.toastHandler('warning', 'No results found for this class, term, and year.');
                return;
            }

            /* ===============================
               STUDENTS IN MAIN CLASS
            =============================== */
            const studentsInMainClass = this.students.filter(s => {
                const c = this.classes.find(cl => String(cl.id) === String(s.classId));
                return c && c.classId === mainClassId;
            });
            
            

            /* ===============================
               BUILD STUDENT SUBJECT MAP
               Each subject is a row
            =============================== */
            const studentSubjectMap = {};

            // individusl this.classid ranking
            /* =============================== STUDENTS IN THIS SPECIFIC CLASS (this.classId) =============================== */
            const studentsInThisClass = this.students.filter(s =>
                String(s.classId) === String(this.classId)
            );
            /* =============================== CALCULATE SUBJECT RANKINGS AND CLASS TOTALS (SPECIFIC TO this.classId) =============================== */
            const subjectRankingsThisClass = {};
            const classTotalsThisClass = {};
            filteredData.forEach(assessment => {
                if (!subjectRankingsThisClass[assessment.subjectId])
                    subjectRankingsThisClass[assessment.subjectId] = {};

                assessment.details.forEach(detail => {
                    const sId = detail.studentIdentifier;

                    // Key change: filter by this specific class only
                    if (!studentsInThisClass.some(st => st.studentIdentifier === sId)) return;

                    if (!subjectRankingsThisClass[assessment.subjectId][sId]) {
                        subjectRankingsThisClass[assessment.subjectId][sId] = {
                            classScoreObtained: 0,
                            classScoreOverall: 0,
                            examScoreObtained: 0,
                            examScoreOverall: 0
                        };
                    }

                    if (assessment.type === 'Exam') {
                        subjectRankingsThisClass[assessment.subjectId][sId].examScoreObtained += detail.marks || 0;
                        subjectRankingsThisClass[assessment.subjectId][sId].examScoreOverall += assessment.overallMark || 0;
                    } else if (assessment.type !== 'MidTerm') {
                        subjectRankingsThisClass[assessment.subjectId][sId].classScoreObtained += detail.marks || 0;
                        subjectRankingsThisClass[assessment.subjectId][sId].classScoreOverall += assessment.overallMark || 0;
                    }
                });
            });
            // Convert to arrays and compute totalScore (same logic)
            Object.keys(subjectRankingsThisClass).forEach(subjectId => {
                const arr = Object.keys(subjectRankingsThisClass[subjectId]).map(sId => {
                    const s = subjectRankingsThisClass[subjectId][sId];
                    const classPercent100 = s.classScoreOverall > 0 ? (s.classScoreObtained / s.classScoreOverall) * 100 : 0;
                    const examPercent100 = s.examScoreOverall > 0 ? (s.examScoreObtained / s.examScoreOverall) * 100 : 0;
                    const weightedClass = (classPercent100 / 100) * classPercentage;
                    const weightedExam = (examPercent100 / 100) * examPercentage;
                    const totalScore = weightedClass + weightedExam;

                    if (!classTotalsThisClass[sId]) classTotalsThisClass[sId] = 0;
                    classTotalsThisClass[sId] += totalScore;

                    return { studentIdentifier: sId, totalScore };
                });

                arr.sort((a, b) => b.totalScore - a.totalScore);
                subjectRankingsThisClass[subjectId] = arr;
            });

// Overall ranking for THIS specific class
            const overallClassRankingThisClass = Object.keys(classTotalsThisClass)
                .map(sId => ({ studentIdentifier: sId, totalScore: classTotalsThisClass[sId] }))
                .sort((a, b) => b.totalScore - a.totalScore);

// Build lookup map
            const classPositionMap = {};
            overallClassRankingThisClass.forEach((entry, index) => {
                classPositionMap[entry.studentIdentifier] = index + 1;
            });
            const totalStudentsInThisClass = overallClassRankingThisClass.length;
            /* ===============================
               CALCULATE SUBJECT RANKINGS
               AND OVERALL CLASS TOTALS
            =============================== */
            const subjectRankings = {};
            const classTotals = {};

            subjectIds.forEach(subjectId => {

                subjectRankings[subjectId] = {};

                const subjectAssignments = filteredData.filter(a =>
                    String(a.subjectId) === String(subjectId)
                );

                subjectAssignments.forEach(assessment => {

                    assessment.details.forEach(detail => {

                        const sId = detail.studentIdentifier;

                        if (!studentsInMainClass.some(st => st.studentIdentifier === sId)) return;

                        if (!subjectRankings[subjectId][sId]) {
                            subjectRankings[subjectId][sId] = {
                                classScoreObtained: 0,
                                classScoreOverall: 0,
                                examScoreObtained: 0,
                                examScoreOverall: 0
                            };
                        }

                        if (assessment.type === 'Exam') {
                            subjectRankings[subjectId][sId].examScoreObtained += detail.marks || 0;
                            subjectRankings[subjectId][sId].examScoreOverall += assessment.overallMark || 0;
                        }
                        else if (assessment.type !== 'MidTerm') {
                            subjectRankings[subjectId][sId].classScoreObtained += detail.marks || 0;
                            subjectRankings[subjectId][sId].classScoreOverall += assessment.overallMark || 0;
                        }
                    });
                });

                // Convert to sorted array
                const arr = Object.keys(subjectRankings[subjectId]).map(sId => {

                    const s = subjectRankings[subjectId][sId];

                    const classPercent100 = s.classScoreOverall > 0 ? (s.classScoreObtained / s.classScoreOverall) * 100 : 0;
                    const examPercent100 = s.examScoreOverall > 0 ? (s.examScoreObtained / s.examScoreOverall) * 100 : 0;

                    const weightedClass = (classPercent100 / 100) * classPercentage;
                    const weightedExam = (examPercent100 / 100) * examPercentage;

                    const totalScore = weightedClass + weightedExam;

                    if (!classTotals[sId]) classTotals[sId] = 0;
                    classTotals[sId] += totalScore;

                    return { studentIdentifier: sId, totalScore };
                });

                arr.sort((a, b) => b.totalScore - a.totalScore);

                subjectRankings[subjectId] = arr;
            });

            // Build overall class ranking
            const overallClassRanking = Object.keys(classTotals)
                .map(sId => ({
                    studentIdentifier: sId,
                    totalScore: classTotals[sId]
                }))
                .sort((a, b) => b.totalScore - a.totalScore);

            /* ===============================
               BUILD FINAL REPORT ROWS
            =============================== */
            const reportRows = [];
            const stageRemarks = [];
            const allStudentReports = [];

            studentsInThisClass.forEach(student => {

                const studentName = [student.lastName, student.firstName, student.otherName]
                    .filter(n => n && String(n).trim() !== '')
                    .join(' ');

                // BUILD STUDENT SUBJECT MAP (PER STUDENT)
                const studentSubjectMap = {};

                subjectIds.forEach(subjectId => {

                    const subjectAssignments = filteredData.filter(a =>
                        String(a.subjectId) === String(subjectId)
                    );

                    let classScoreObtained = 0;
                    let classScoreOverall = 0;
                    let examScoreObtained = 0;
                    let examScoreOverall = 0;

                    subjectAssignments.forEach(assessment => {

                        const studentDetail = (assessment.details || []).find(d =>
                            String(d.studentIdentifier) === String(student.studentIdentifier)
                        );

                        if (!studentDetail) return;

                        if (assessment.type === 'Exam') {
                            examScoreObtained += studentDetail.marks || 0;
                            examScoreOverall += assessment.overallMark || 0;
                        } else if (assessment.type !== 'MidTerm') {
                            classScoreObtained += studentDetail.marks || 0;
                            classScoreOverall += assessment.overallMark || 0;
                        }
                    });

                    studentSubjectMap[subjectId] = {
                        SubjectId: subjectId,
                        SubjectName: this.getSubjectName(subjectId),
                        classScoreObtained,
                        classScoreOverall,
                        examScoreObtained,
                        examScoreOverall
                    };
                });

               
                Object.values(studentSubjectMap).forEach(subject => {

                    const classPercent100 = subject.classScoreOverall > 0
                        ? (subject.classScoreObtained / subject.classScoreOverall) * 100
                        : 0;
                    const percentageClassScore = (classPercent100 / 100) * classPercentage;

                    const examPercent100 = subject.examScoreOverall > 0
                        ? (subject.examScoreObtained / subject.examScoreOverall) * 100
                        : 0;
                    const percentageExam = (examPercent100 / 100) * examPercentage;

                    const totalScore = percentageClassScore + percentageExam;
                    const remarkObj = this.getSubjectRemark(totalScore, stage);

                    const subjectRankingArray = subjectRankings[subject.SubjectId] || [];
                    const overallSubjectPosition =
                        subjectRankingArray.findIndex(s => s.studentIdentifier === student.studentIdentifier) + 1;

                    const overallClassPosition =
                        overallClassRanking.findIndex(s => s.studentIdentifier === student.studentIdentifier) + 1;

                    const classAveragePerSubject =
                        subjectRankingArray.length > 0
                            ? subjectRankingArray.reduce((sum, s) => sum + s.totalScore, 0) / subjectRankingArray.length
                            : 0;

                    // IMPORTANT: use student.id here (not this.studentId)
                    const attendanceDays = this.getAttendance(student.id);
                    const conductRemark = this.getBehaviouralRemark('Conduct', student.id);
                    const attitudeRemark = this.getBehaviouralRemark('Attitude', student.id);
                    const classTeacherRemark = this.getClassTeacherRemark(student.id, this.classId);
                    const headTeacherRemark = this.getHeadTeacherRemark(student.id, this.classId);

                    const subjectTeacher = this.subjectTeachers.find(t => t.subjectId === subject.SubjectId)?.staffId;
                    const subjectTeacherName = this.teachers.find(t => String(t.id) === String(subjectTeacher))?.fullName || '';

                    reportRows.push({
                        SubjectId: subject.SubjectId,
                        StudentId: student.id,
                        StudentIdentifier: student.studentIdentifier,
                        StudentName: studentName,

                        SubjectName: subject.SubjectName,
                        SubjectTeacher: subjectTeacherName,

                        ClassScoreObtained: subject.classScoreObtained,
                        ClassScoreOverall: subject.classScoreOverall,
                        PercentageClassScore: percentageClassScore,

                        ExamScoreObtained: subject.examScoreObtained,
                        ExamScoreOverall: subject.examScoreOverall,
                        PercentageExam: percentageExam,

                        TotalScore: totalScore,
                        GradeNumber: remarkObj ? remarkObj.gradeNumber : 'N/A',
                        SubjectRemark: remarkObj ? remarkObj.remark : 'N/A',

                        Attendance: attendanceDays,
                        Conduct: conductRemark,
                        Attitude: attitudeRemark,

                        ClassName: className,
                        Title: this.reportTitle,
                        Term: termName,
                        TermEndDate: endTermDate,
                        Year: academicYearName,
                        SchoolDays: schoolDays,
                        TeacherName: teacherName,

                        ClassTeacherRemarks: classTeacherRemark,
                        HeadTeacherRemarks: headTeacherRemark,

                        PromotedClassName: promotedClassName,
                        TermBeginDate: termBeginDate,

                        ClassAveragePerSubject: classAveragePerSubject,
                        PositionPerSubject: overallSubjectPosition,
                        OverallClassPosition: overallClassPosition,
                        ClassPosition: classPositionMap[student.studentIdentifier] || 0,
                    });
                });

                allStudentReports.push({
                    studentId: student.id,
                    studentIdentifier: student.studentIdentifier,
                    studentName,
                    rows: reportRows
                });
            });
            this.terminalReport = allStudentReports;
            
            /* ===============================
               AGGREGATE / RAW SCORE
            =============================== */
            reportRows.sort((a, b) => a.SubjectName.localeCompare(b.SubjectName));
            let aggregate = 0;
            let rawScore = 0;

            const normalizedStage = (stage || '').toString().trim().toLowerCase();

            if (normalizedStage === 'jhs' || normalizedStage.includes('junior high')) {
                const subjectSettings = this.mainSubjects || [];

                const coreSubjects = reportRows.filter(r => {
                    const subjectInfo = subjectSettings.find(s => String(s.id) === String(r.SubjectId));
                    return subjectInfo && subjectInfo.isCore === true;
                });

                const electiveSubjects = reportRows.filter(r => {
                    const subjectInfo = subjectSettings.find(s => String(s.id) === String(r.SubjectId));
                    return subjectInfo && subjectInfo.isBestSubject === true && subjectInfo.isCore !== true;
                });

                const bestTwo = electiveSubjects
                    .sort((a, b) => b.TotalScore - a.TotalScore)
                    .slice(0, 2);

                const subjectsUsed = [...coreSubjects, ...bestTwo];

                subjectsUsed.forEach(sub => {
                    aggregate += parseInt(sub.GradeNumber) || 0;
                    rawScore += sub.TotalScore || 0;
                });
            }

            reportRows.forEach(r => {
                r.Aggregate = aggregate;
                r.RawScore = rawScore;
            });

            this.terminalReport = reportRows;
            this.stageRemarks = stageRemarks;
            this.renderReport(this.header, reportRows, this.reportPath);
        },
        renderReport(header, details, reportPath) {
            $("#reportView").empty();
            $("#reportView").boldReportViewer({
                reportServiceUrl: this.reportApiBaseUrl,
                processingMode: ej.ReportViewer.ProcessingMode.Local,
                toolbarSettings: {
                    showToolbar: true,
                    items: ej.ReportViewer.ToolbarItems.All &
                        ~ej.ReportViewer.ToolbarItems.Print
                },
                reportPath: reportPath,
                dataSources: [{
                    value: header,
                    name: "DataSet1"
                },
                    {
                        value: details,
                        name: "DataSet2"
                    },
                   
                ]
            });
        },
        printReport() {
            axios.get('/SmReports/DownloadTerminalReportPdf', {
                params: {
                    studentId: this.studentId,
                    classId: this.classId,
                    academicYearId: this.academicYearId,
                    termId: this.termId
                },
                responseType: 'blob'
            })
                .then(response => {
                    const blob = new Blob([response.data], {
                        type: 'application/pdf'
                    });
                    const fileURL = URL.createObjectURL(blob);
                    window.open(fileURL);
                })
                .catch(error => {
                    console.error('Error generating report:', error);
                });
        },
        normalizeDate(date) {
            if (!date) return null;
            return new Date(date).toISOString().split('T')[0];
        },
        toastHandler(type, message = 'An unexpected error occurred.') {

            //display alert with 
            toastr.options = {
                closeButton: true,
                progressBar: true,
                showMethod: 'fadeIn',
                hideMethod: 'fadeOut',
                timeOut: 10000,
            };

            switch (type) {

                case 'warning':
                    toastr.warning('', message);
                    break;
                case 'error':
                    toastr.error('', message);
                    break;
                default:
                    toastr.success('', message);
                    break;
            }

        },

    },
});
app.mount('#app');