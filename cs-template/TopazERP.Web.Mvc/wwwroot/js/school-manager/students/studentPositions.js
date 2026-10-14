const app = Vue.createApp({
    data() {
        return {
            positionList: [],
            academicYearList: [],
            studentPositions: [],
            studentName: '',
            form: {
                id: '',
                studentId: window.studentId || '',
                positionId: '',
                positionName: '',
                academicYearId: '',
                academicYearName: ''
            }
        }
    },

    methods: {
        goBack() {
            window.history.back();
        },
        getDropdowns() {
            axios.get('/SmStudentSetups/ListAllPosition')
                .then(res => {
                    this.positionList = res.data;
                    $('#positionId').ejDropDownList({
                        dataSource: this.positionList,
                        watermarkText: "Select...",
                        width: "100%",
                        enableFilterSearch: true,
                        fields: { id: "id", text: "name", value: "id" },
                        change: args => this.form.positionId = args.value
                    });
                });

            axios.get('/SmMainSetups/ListAllAcademicYears')
                .then(res => {
                    this.academicYearList = res.data;
                    $('#academicYearId').ejDropDownList({
                        dataSource: this.academicYearList,
                        watermarkText: "Select...",
                        width: "100%",
                        enableFilterSearch: true,
                        fields: { id: "id", text: "name", value: "id" },
                        change: args => this.form.academicYearId = args.value
                    });
                });
        },

        getStudent() {
            axios.get(`/SmStudentSetups/GetStudentById?id=${this.form.studentId}`)
                .then(res => {
                    var s = res.data;
                    this.studentName = `${s.firstName} ${s.otherName || ''} ${s.lastName}`.trim();
                });
        },

        getStudentPositions() {
            axios.get(`/SmStudentSetups/ListStudentPosition?studentId=${this.form.studentId}`)
                .then(res => this.studentPositions = res.data);
        },

        saveStudentPosition() {
            this.setPositionName();
            this.setAcademicYearName();

            axios.post('/SmStudentSetups/CreateStudentPosition', this.form)
                .then(response => {
                    if (response.data.code === 200) {
                        this.toastHandler('', 'Position added.');
                        this.getStudentPositions();
                        this.resetForm();
                    } else {
                        this.toastHandler('error', response.data.message);
                    }
                });
        },

        deleteStudentPosition(id) {
            axios.post(`/SmStudentSetups/DeleteStudentPosition?id=${id}`)
                .then(() => {
                    this.toastHandler('', 'Position removed.');
                    this.getStudentPositions();
                });
        },

        setPositionName() {
            var sel = this.positionList.find(x => x.id === this.form.positionId);
            this.form.positionName = sel ? sel.name : '';
        },

        setAcademicYearName() {
            var sel = this.academicYearList.find(x => x.id === this.form.academicYearId);
            this.form.academicYearName = sel ? sel.name : '';
        },

        resetForm() {
            this.form.id = '';
            this.form.positionId = '';
            this.form.positionName = '';
            this.form.academicYearId = '';
            this.form.academicYearName = '';

            $("#positionId").ejDropDownList("value", "");
            $("#academicYearId").ejDropDownList("value", "");
        },

        toastHandler(type, message) {
            toastr.success(message);
        }
    },

    mounted() {
        this.getStudent();
        this.getDropdowns();
        this.getStudentPositions();
    }
});
app.mount('#app');
