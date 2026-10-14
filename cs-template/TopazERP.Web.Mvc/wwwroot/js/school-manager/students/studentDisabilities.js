const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            payload: {},
            disabilityList: [],
            form: {
                id: '',
                studentId: window.studentId || '',
                disabilityId: '',
                disabilityName: ''
            },
            studentName: '',
            studentDisabilities: []
        }
    },

    methods: {
        goBack() {
            window.history.back();
        },
        getSetupData() {
            axios.get('/SmStudentSetups/ListAllDisability')
                .then(res => {
                    this.disabilityList = res.data;

                    $('#disabilityId').ejDropDownList({
                        dataSource: this.disabilityList,
                        width: "100%",
                        watermarkText: "Select...",
                        enableFilterSearch: true,
                        fields: { id: "id", text: "name", value: "id" },
                        value: this.form.disabilityId,
                        change: args => this.form.disabilityId = args.value
                    });
                })
                .catch(() => this.toastHandler('error', 'Unable to load disability list.'));
        },

        getStudent() {
            axios.get(`/SmStudentSetups/GetStudentById?id=${this.form.studentId}`)
                .then(res => {
                    this.payload = res.data;
                    this.studentName =
                        `${res.data.firstName} ${res.data.otherName || ''} ${res.data.lastName}`.trim();
                })
                .catch(() => this.toastHandler('error', 'Unable to get student data.'));
        },

        getStudentDisability() {
            axios.get(`/SmStudentSetups/ListStudentDisability?studentId=${this.form.studentId}`)
                .then(res => this.studentDisabilities = res.data)
                .catch(() => this.toastHandler('error', 'Unable to load disability data.'));
        },

        saveStudentDisability() {
            this.setDisabilityName();

            axios.post('/SmStudentSetups/CreateStudentDisability', this.form)
                .then(response => {
                    if (response.data.code === 200) {
                        this.toastHandler('', 'data saved.');
                        this.getStudentDisability();
                        this.resetForm();
                    } else {
                        this.toastHandler('error', response.data.message);
                    }
                })
                .catch(() => this.toastHandler('error', 'Unable to assign disability.'));
        },

        updateStudentDisability() {
            axios.post('/SmStudentSetups/UpdateStudentDisability', this.form)
                .then(() => {
                    this.toastHandler('', 'Disability updated successfully.');
                    this.getStudentDisability();
                    this.resetForm();
                })
                .catch(() => this.toastHandler('error', 'Unable to update disability.'));
        },

        editStudentDisability(item) {
            this.form.id = item.id;
            this.form.disabilityId = item.disabilityId;
            this.form.disabilityName = item.disabilityName;

            $("#disabilityId").ejDropDownList("value", item.disabilityId);
        },

        deleteStudentDisability(id) {
            axios.post(`/SmStudentSetups/DeleteStudentDisability?id=${id}`)
                .then(() => {
                    this.toastHandler('', 'Disability removed successfully.');
                    this.getStudentDisability();
                })
                .catch(() => this.toastHandler('error', 'Unable to delete disability.'));
        },

        setDisabilityName() {
            const selected = this.disabilityList.find(d => d.id === this.form.disabilityId);
            this.form.disabilityName = selected ? selected.name : '';
        },

        resetForm() {
            this.form.id = '';
            this.form.disabilityId = '';
            this.form.disabilityName = '';
            $("#disabilityId").ejDropDownList("value", "");
        },

        toastHandler(type, message = 'An unexpected error occurred.') {
            toastr.options = {
                closeButton: true,
                progressBar: true,
                timeOut: 4000
            };

            if (type === 'error') toastr.error(message);
            else if (type === 'warning') toastr.warning(message);
            else toastr.success(message);
        }
    },

    mounted() {
        this.getStudent();
        this.getSetupData();
        this.getStudentDisability();
    }
});
app.mount('#app');