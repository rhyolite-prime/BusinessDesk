const app = Vue.createApp({
    data() {
        return {
            academicYears: [],
            terms: [],
            classes: [],
            subjects: [],
            teachers: [],
            days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            timeTables: [],
            detailsList: [],
            form: {
                academicYearId: null,
                termId: null,
                classId: null,
                day: null,
                details: []
            },
            saving: false,
            assignedSubjects: [],
            mainClasses: [],
            streams: []
        }
    },
    async mounted() {
        this.getAllTimeTables();
        this.getAllAssignedSubjects();
        await this.loadAcademicYears();
        await this.loadLevelClasses();
        await this.loadTerms();
        await this.loadClasses();
        await this.loadStreams();
        await this.loadSubjects();
        await this.loadTeachers();
        await this.loadDropdowns();
    },
    computed: {
        subjectsForSelectedClass() {
            if (!this.form.academicYearId || !this.form.termId || !this.form.classId) return [];

            const assigned = this.assignedSubjects.find(a =>
                a.academicYearId === this.form.academicYearId &&
                a.termId === this.form.termId &&
                a.classId === this.form.classId
            );

            return assigned ? assigned.details : [];
        }
    },
    watch: {
        'form.academicYearId'() { this.validateDetailsList(); },
        'form.termId'() { this.validateDetailsList(); },
        'form.classId'() { this.validateDetailsList(); }
    },
    methods: {
        validateDetailsList() {
            if (!this.detailsList.length) return;

            const validSubjects = this.subjectsForSelectedClass.map(s => s.subjectId);
            this.detailsList = this.detailsList.filter(d => validSubjects.includes(d.subjectId));
        },
        getAllAssignedSubjects() {
            axios.get('/SmDataEntry/GetAllAssignedSubjects/')
                .then(res => {
                    this.assignedSubjects = res.data;
                })
                .catch(() => {
                    this.toastHandler('error', 'Failed to load assigned subjects.');
                });
        },
        printPreview() {
            const activeYear = this.academicYears.find(y => y.isActive);
            if (!activeYear) {
                this.toastHandler('warning', 'No active academic year found.');
                return;
            }

            const currentDate = new Date().toLocaleDateString();

            let html = `
<html>
<head>
    <title>Full Timetable Report</title>
    <style>
        body { font-family: "Times New Roman"; }
        h3, h4 { text-align: center; margin: 5px 0; text-decoration: underline; }

        .header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 80px;
            text-align: center;
            z-index: 999;
        }

        .content {
            margin-top: 90px; 
            margin-bottom: 60px;
        }

        table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 30px; }
        th, td { border: 1px solid #000; padding: 6px; font-size: 12px; vertical-align: top; }
        thead th { background-color: #f2f2f2; text-align: center; }
        td { text-align: left; }
        
        @media print {
            .footer {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                height: 50px;
                border-top: 1px solid #000;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 12px;
                padding: 0 20px;
                background-color: white;
            }

            .content { page-break-inside: avoid; }

            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }

            .page-break { page-break-before: always;  margin-top: 90px; 
            margin-bottom: 60px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h4>Time Tables For Current Academic Year: ${activeYear.name}</h4>
    </div>

    <div class="content">
`;

            // Filter timetables for active academic year
            const activeYearTimeTables = this.timeTables.filter(tt => tt.academicYearId === activeYear.id);

            // Group by term
            const terms = [...new Set(activeYearTimeTables.map(tt => tt.termId))];

            terms.forEach((termId, termIndex) => {
                const termName = this.terms.find(t => t.id === termId)?.name || '';
                html += `<h5>Term: ${termName}</h5>`;

                // Classes for this term
                const classes = [...new Set(activeYearTimeTables
                    .filter(tt => tt.termId === termId)
                    .map(tt => tt.classId))];

                classes.forEach(classId => {
                    const className = this.classes.find(c => c.id === classId)?.name || '';
                    html += `<h5>Class: ${className}</h5>`;

                    // Table header with all 7 days
                    html += `<table>
                <thead>
                    <tr>
                        <th>Period</th>
                        ${this.days.map(day => `<th>${day}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
            `;

                    // Collect all periods for this term/class
                    const dayPeriods = {};
                    this.days.forEach(day => {
                        dayPeriods[day] = activeYearTimeTables
                            .filter(tt => tt.termId === termId && tt.classId === classId && tt.day === day)
                            .flatMap(tt => tt.details || [])
                            .map(d => {
                                const subject = this.subjects.find(s => s.id === d.subjectId)?.name || '';
                                const teacherObj = this.teachers.find(t => t.id === d.teacherId);
                                const teacher = teacherObj ? `${teacherObj.firstName} ${teacherObj.lastName}` : '';
                                return `${subject} (${teacher})<br>${d.startTime || ''} - ${d.endTime || ''}`;
                            });
                    });

                    const maxRows = Math.max(...Object.values(dayPeriods).map(arr => arr.length));
                    for (let i = 0; i < maxRows; i++) {
                        html += '<tr>';
                        html += `<td>Period ${i + 1}</td>`;
                        this.days.forEach(day => {
                            html += `<td>${dayPeriods[day][i] || ''}</td>`;
                        });
                        html += '</tr>';
                    }

                    html += `</tbody></table>`;
                });

                // Page break after term except last
                if(termIndex < terms.length - 1) html += `<div class="page-break"></div>`;
            });

            html += `
    </div>

    <div class="footer">
                <div class="right">Printed On - ${currentDate}</div>
                 <div class="center">Topaz School Manager</div>
                <div class="left">Page 1</div>
            </div>
</body>
</html>
`;

            const printWindow = window.open('', '', 'width=1200,height=800');
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        },

        async loadLevelClasses() {
            try {
                const response = await axios.get('/SmMainSetups/ListAllLevelClasses/');
                this.classes = response.data;

            } catch (error) {
                console.error("Error loading level classes:", error);
            }
        },
        async loadAcademicYears() {
            try {
                const response = await axios.get('/SmMainSetups/ListAllAcademicYears');

                this.academicYears = response.data;
                
                const activeYear = this.academicYears.find(y => y.isActive);
                if(activeYear) this.form.academicYearId = activeYear.id;
            } catch (error) {
                console.error("Error loading academic years:", error);
            }
        },

        async loadTerms() {
            try {
                const response = await axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`);
                this.terms = response.data;

            } catch (error) {
                console.error("Error loading terms:", error);
            }
        },
        async loadSubjects() {
            try {
                const response = await axios.get('/SmMainSetups/ListAllSubjects');

                this.subjects = response.data.sort((a, b) => a.name.localeCompare(b.name));

            } catch (error) {
                console.error("Error loading assigned subjects:", error);
            }
        },
        async loadClasses() {
            try {
                const response = await axios.get('/SmMainSetups/ListAllClasses/');
                this.mainClasses = response.data;

            } catch (error) {
                console.error("Error loading classes:", error);
            }
        },


        async loadStreams() {
            try {
                const response = await axios.get('/SmMainSetups/ListAllStreams/');
                this.streams = response.data;

            } catch (error) {
                console.error("Error loading streams:", error);
            }
        },
        async loadTeachers() {
            try {
                const response = await axios.get('/SmStaffSetups/ListAllStaffBios/');

                this.teachers = response.data.filter(
                    x => x.isTeacher === true
                );

            } catch (error) {
                console.error("Error loading teachers:", error);
            }
        },
        loadDropdowns() {
                this.initDropdowns();
                this.getAllTimeTables();
                
        },
        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
        },
        getLevelClassName(levelClass) {
            return `${this.getMainClassName(levelClass.classId)} ${this.getStreamName(levelClass.streamId)}`.trim();
        },
        getLevelClassNameFromId(levelClassId) {
            const levelClass = this.classes.find(c => c.id === levelClassId);
            return levelClass ? this.getLevelClassName(levelClass) : '';
        },
        setSubjectName(subjectId) {
            const subject = this.subjects.find(s => s.id === subjectId);
            this.form.subjectName = subject ? subject.name : '';
        },

        initDropdowns() {
            $('#academicYearId').ejDropDownList({
                dataSource: this.academicYears,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                value: this.form.academicYearId,
                change: args => { this.form.academicYearId = args.value;
                    this.setAcademicYearName();
                    this.findExistingTimeTable();}
            });
            $('#termId').ejDropDownList({
                dataSource: this.terms,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.form.termId = args.value;
                    this.setTermName();
                    this.findExistingTimeTable();
                }
            });
            $('#classId').ejDropDownList({
                dataSource: this.classes.map(c => ({
                    id: c.id,
                    name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
                })),
                width: "100%",
                watermarkText: "Select Class...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.form.classId = args.value;
                    this.setClassName();
                    this.findExistingTimeTable();
                }
            });

            $('#dayId').ejDropDownList({
                dataSource: this.days,
                width: "100%",
                watermarkText: "Select Day...",
                enableFilterSearch: true,
                fields: { text: "text", value: "text" },
                change: args => {
                    this.form.day = args.value;
                    this.findExistingTimeTable();
                }
            });
        },
        /* ===========================
                  SET DISPLAY NAMES
           ============================ */
        setAcademicYearName() {
            const s = this.academicYears.find(x => x.id === this.form.academicYearId);
            this.form.academicYearName = s ? s.name : '';
        },

        setClassName() {
            const s = this.classes.find(x => x.id === this.form.classId);
            this.form.className = s ? s.name : '';
        },

        setTermName() {
            const s = this.terms.find(x => x.id === this.form.termId);
            this.form.termName = s ? s.name : '';
        },
        setTeacherName() {
            const s = this.teachers.find(x => x.id === this.form.teacherId);
            // combine first and last name
            this.form.teacherName = s ? `${s.firstName} ${s.lastName}` : '';
        },
        getSubjectName(subjectId) {
            return this.subjects.find(s => s.id === subjectId)?.name || '';
        },

        getAllTimeTables() {
            axios.get('/SmDataEntry/GetAllTimeTables')
                .then(res => {
                    this.timeTables = res.data;
                    this.findExistingTimeTable();
                });
        },



        addDetail() {
            this.detailsList.push({
                id: this.uuid(),
                subjectId: this.subjects.length ? this.subjects[0].id : null,
                teacherId: this.teachers.length ? this.teachers[0].id : null,
                startTime: "08:00",
                endTime: "09:00"
            });
            this.form.details.push(this.detailsList);
        },

        removeDetail(index) {
            this.detailsList.splice(index, 1);
        },

        saveTimeTable() {

            if (!this.form.academicYearId || !this.form.classId || !this.form.termId || !this.form.day) {
                this.toastHandler('error', 'Please complete all selections');
                return;
            }

            if (this.detailsList.length === 0) {
                this.toastHandler('error', 'Please assign at least one period.');
                return;
            }

            this.saving = true;

            const api = this.form.id
                ? '/SmDataEntry/UpdateTimeTable'
                : '/SmDataEntry/CreateTimeTable';
            
            const payload = {
                ...this.form,
                details: this.detailsList
            };

            axios.post(api, payload)
                .then(() => {
                    this.toastHandler('', 'Data saved successfully.');
                    this.getAllTimeTables(); 
                    this.resetForm();
                })
                .catch(() => {
                    this.toastHandler('error', 'Failed to save data.');
                })
                .finally(() => {
                    this.saving = false;
                });
        },


        findExistingTimeTable() {
            if(!this.form.academicYearId || !this.form.classId || !this.form.termId || !this.form.day)
                return;

            const match = this.timeTables.find(tt =>
                tt.academicYearId === this.form.academicYearId &&
                tt.classId === this.form.classId &&
                tt.termId === this.form.termId &&
                tt.day === this.form.day
            );

            if (match) {
                this.form.id = match.id;
                this.form.tenantId = match.tenantId;

                this.detailsList = match.details.map(d => ({
                    id: d.id,
                    subjectId: d.subjectId,
                    subjectName: d.subjectName,
                    teacherId: d.teacherId,
                    teacherName: d.teacherName,
                    startTime: d.startTime,
                    endTime: d.endTime
                }));
            } else {
                this.form.id = null;
                this.detailsList = [];
            }

        },

        resetForm() {
            this.form.academicYearId = null;
            this.form.termId = null;
            this.form.classId = null;
            this.form.day = null;
            this.detailsList = [];

            $('#academicYearId').ejDropDownList("option", "value", "");
            $('#termId').ejDropDownList("option", "value", "");
            $('#classId').ejDropDownList("option", "value", "");
            $('#dayId').ejDropDownList("option", "value", "");
        },

        toastHandler(type, message) {
            toastr.options = { closeButton:true, progressBar:true, timeOut:4000 };
            type === 'error' ? toastr.error(message) : toastr.success(message);
        },

        uuid() {
            return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        }
    }
});
app.mount('#app');
