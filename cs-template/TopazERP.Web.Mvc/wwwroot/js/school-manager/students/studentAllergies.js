const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            payload: {},
            allergyList: [],
            form: {
                id: '',
                studentId: window.studentId || '',
                allergyTypeId: '',
                allergyTypeName: ''
            },
            studentName: '',
            studentAllergies: []
        }
    },
    methods: {
        goBack() {
            window.history.back(); 
        },
        getSetupData() {
            axios.get('/SmStudentSetups/ListAllAllergy')
                .then(res => {
                    this.allergyList = res.data;

                    $('#allergyTypeId').ejDropDownList({
                        dataSource: this.allergyList,
                        width: "100%",
                        watermarkText: "Select...",
                        enableFilterSearch: true,
                        fields: { id: "id", text: "name", value: "id" },
                        value: this.form.allergyTypeId,
                        change: args => this.form.allergyTypeId = args.value
                    });
                })
                .catch(() => this.toastHandler('error', 'Unable to get data.'));
        },
        getStudent() {
            axios.get(`/SmStudentSetups/GetStudentById?id=${this.form.studentId}`)
                .then(res => {
                    this.payload = res.data;
                    this.studentName = `${res.data.firstName} ${res.data.otherName || ''} ${res.data.lastName}`.trim();
                })
                .catch(() => this.toastHandler('error', 'Unable to get student data.'));
        },
        getStudentAllergy() {
            axios.get(`/SmStudentSetups/ListStudentAllergy?studentId=${this.form.studentId}`)
                .then(res => this.studentAllergies = res.data)
                .catch(() => this.toastHandler('error', 'Unable to load allergy data.'));
        },

        saveStudentAllergy() {
            this.setAllergyTypeName();

            axios.post('/SmStudentSetups/CreateStudentAllergy', this.form)
                .then(response => {
                    if (response.data.code === 200) {
                        this.toastHandler('', 'data saved.');
                        this.getStudentAllergy();
                        this.resetForm();
                    } else {
                        this.toastHandler('error', response.data.message);
                    }
                })
                .catch(() => this.toastHandler('error', 'Unable to assign allergy.'));
        },

        updateStudentAllergy() {
            axios.post('/SmStudentSetups/UpdateStudentAllergy', this.form)
                .then(() => {
                    this.toastHandler('', 'Allergy updated successfully.');
                    this.getStudentAllergy();
                    this.resetForm();
                })
                .catch(() => this.toastHandler('error', 'Unable to update allergy.'));
        },

        editStudentAllergy(item) {
            this.form.id = item.id;
            this.form.allergyTypeId = item.allergyTypeId;
            this.form.allergyTypeName = item.allergyTypeName;

            $("#allergyTypeId").ejDropDownList("value", item.allergyTypeId);
        },

        deleteStudentAllergy(id) {
            axios.post(`/SmStudentSetups/DeleteStudentAllergy?id=${id}`)
                .then(() => {
                    this.toastHandler('', 'Allergy deleted successfully.');
                    this.getStudentAllergy();
                })
                .catch(() => this.toastHandler('error', 'Unable to delete allergy.'));
        },

        setAllergyTypeName() {
            const selected = this.allergyList.find(a => a.id === this.form.allergyTypeId);
            this.form.allergyTypeName = selected ? selected.name : '';
        },

        resetForm() {
            this.form.id = '';
            this.form.allergyTypeId = '';
            this.form.allergyTypeName = '';
            $("#allergyTypeId").ejDropDownList("value", "");
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
        this.getStudentAllergy();
    }
});
app.mount('#app');
