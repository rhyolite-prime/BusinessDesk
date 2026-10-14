const app = Vue.createApp({
    data() {
        return {
            payload: {},
            studentName: '',

            statusList: [],
            statusHistory: [],

            form: {
                studentId: window.studentId || '',
                statusId: '',
                statusName: '',
                reason: '',
                academicYearId: '',
                academicYearName: '',
                changeDate: new Date().toISOString().substr(0, 10)
            }
        }
    },

    methods: {

        goBack() {
            window.history.back();
        },

        getStudent() {
            axios.get(`/SmStudentSetups/GetStudentById?id=${this.form.studentId}`)
                .then(res => {
                    this.payload = res.data;
                    this.form.statusId = res.data.statusId;
                    this.form.statusName = res.data.statusName;
                    this.form.academicYearId = res.data.academicYearId;
                    this.form.academicYearName = res.data.academicYearName;
                    this.studentName = `${res.data.firstName} ${res.data.otherName || ''} ${res.data.lastName}`.trim();
                    this.form.studentName = this.studentName;
                    this.form.studentIdentifier = res.data.studentIdentifier;
                    $("#statusId").data("ejDropDownList").option("value", this.form.statusId);
                })
                .catch(() => this.toastHandler('error', 'Unable to load student.'));
        },

        getStatusList() {
            axios.get(`/jsonDataSample/studentStatuses.json?v=${new Date().getTime()}`)
                .then(res => {
                    this.statusList = res.data;

                    $('#statusId').ejDropDownList({
                        dataSource: this.statusList,
                        width: "100%",
                        watermarkText: "Select...",
                        enableFilterSearch: true,
                        fields: { id: "id", text: "name", value: "id" },
                        value: this.form.statusId,
                        change: args => this.form.statusId = args.value
                    });
                })
                .catch(() => this.toastHandler('error', 'Unable to load statuses.'));
        },

        setStatusName() {
            const s = this.statusList.find(x => x.id === this.form.statusId);
            this.form.statusName = s ? s.name : '';
        },

        saveStatus() {
            this.setStatusName();
            axios.post('/SmStudentSetups/ChangeStudentStatus', this.form)
                .then(() => {
                    this.toastHandler('', 'Student status updated.');
                    this.resetForm();
                })
                .catch(() => this.toastHandler('error', 'Unable to update status.'));
        },

        resetForm() {
            window.location.reload();
        },

        formatDate(d) {
            return new Date(d).toLocaleDateString();
        },

        toastHandler(type, message) {
            toastr.options = {
                closeButton: true,
                progressBar: true,
                timeOut: 4000
            };
            if (type === 'error') toastr.error(message);
            else toastr.success(message);
        }

    },

    mounted() {
        this.getStatusList();
        this.getStudent();
        
    }
});
app.mount('#app');
