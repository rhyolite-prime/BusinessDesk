const app = Vue.createApp({
    data() {
        return {
            payload: {},
            studentName: "",
            form: {
                id: "",
                studentId: window.studentId,
                doctorName: "",
                doctorPhone: "",
                medicalConditions: [],
                medications: [],
                clinicName: "",
                clinicPhone: "",
                emergencyContactName: "",
                emergencyContactPhone: "",
            },

            conditions: [],
            medications: [],
            conditionInput: "",
            medicationInput: "",
            immunizations: [],
            immunizationTypes: [],

            immForm: {
                id: "",
                studentId: window.studentId,
                immunizationTypeId: "",
                immunizationTypeName: "",
                isImmunized: false,
                immunizationDate: new Date().toISOString().substr(0, 10),
            },
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
                    this.studentName = `${res.data.firstName} ${res.data.otherName || ''} ${res.data.lastName}`.trim();
                });
        },
        loadImmunizationTypes() {
            axios.get('/SmStudentSetups/ListAllImmunization/')
                .then(res => {
                    this.immunizationTypes = res.data;

                    $('#immunizationTypeId').ejDropDownList({
                        dataSource: this.immunizationTypes,
                        width: "100%",
                        enableFilterSearch: true,
                        watermarkText: "Select Immunization",
                        fields: { id: "id", text: "name", value: "id" },
                        value: this.immForm.immunizationTypeId,
                        change: args => this.immForm.immunizationTypeId = args.value
                    });
                })
                .catch(() => this.toast("Unable to load immunization types"));
        },
        setImmunizationTypeName() {
            const selected = this.immunizationTypes.find(x => x.id === this.immForm.immunizationTypeId);
            this.immForm.immunizationTypeName = selected ? selected.name : "";
        },

        loadMedical() {
            axios.get(`/SmStudentSetups/ListStudentMedicals?studentId=${this.form.studentId}`)
                .then(res => {

                    if (!res.data || res.data.length === 0) return;

                    let m = res.data[0];   // <<— FIX HERE

                    this.form.id = m.id;
                    this.form.doctorName = m.doctorName;
                    this.form.doctorPhone = m.doctorPhone;
                    this.form.clinicName = m.clinicName;
                    this.form.clinicPhone = m.clinicPhone;
                    this.form.emergencyContactName = m.emergencyContactName;
                    this.form.emergencyContactPhone = m.emergencyContactPhone;
                    this.form.tenantId = m.tenantId;

                    // Arrays from API
                    this.conditions = m.medicalConditions || [];
                    this.medications = m.medications || [];
                });
        },



        addCondition() {
            if (!this.conditionInput.trim()) return;
            this.conditions.push(this.conditionInput.trim());
            this.conditionInput = "";
        },

        removeCondition(index) {
            this.conditions.splice(index, 1);
        },

        addMedication() {
            if (!this.medicationInput.trim()) return;
            this.medications.push(this.medicationInput.trim());
            this.medicationInput = "";
        },

        removeMedication(index) {
            this.medications.splice(index, 1);
        },

        saveMedical() {

            this.form.medicalConditions = this.conditions;
            this.form.medications = this.medications;

            let url = this.form.id
                ? "/SmStudentSetups/UpdateStudentMedical"
                : "/SmStudentSetups/CreateStudentMedical";

            axios.post(url, this.form)
                .then(() => {
                    this.toast("Saved successfully");
                });
        },

        loadImmunizations() {
            axios.get(`/SmStudentSetups/ListStudentImmunization?studentId=${this.form.studentId}`)
                .then(res => this.immunizations = res.data
                    // format date
                    .map(x => ({
                        ...x,
                        immunizationDate: x.immunizationDate
                            ? new Date(x.immunizationDate).toISOString().substr(0, 10)
                            : ""
                    }))
                    
                
                )
                .catch(() => this.toast("Unable to load immunizations"));
        },
        saveImmunization() {
            this.setImmunizationTypeName();

            let url = this.immForm.id
                ? "/SmStudentSetups/UpdateStudentImmunization"
                : "/SmStudentSetups/CreateStudentImmunization";

            axios.post(url, this.immForm)
                .then(() => {
                    this.toast("Immunization saved successfully");
                    this.resetImmunizationForm();
                    this.loadImmunizations();
                })
                .catch(() => this.toast("Unable to save immunization"));
        },
        editImmunization(item) {
            this.immForm.id = item.id;
            this.immForm.immunizationTypeId = item.immunizationTypeId;
            this.immForm.immunizationTypeName = item.immunizationTypeName;
            this.immForm.isImmunized = item.isImmunized;
            this.immForm.immunizationDate = item.immunizationDate;
            this.immForm.tenantId = item.tenantId;
            let dropdown = $("#immunizationTypeId").data("ejDropDownList");
            if (dropdown) {
                dropdown.option("value", item.immunizationTypeId);
            }
        },
        deleteImmunization(item) {
            if (!confirm("Are you sure you want to delete this immunization record?")) return;

            axios.post("/SmStudentSetups/DeleteStudentImmunization", { id: item.id })
                .then(() => {
                    this.toast("Immunization deleted successfully");
                    this.loadImmunizations();
                })
                .catch(() => this.toast("Unable to delete immunization"));
        },
        resetImmunizationForm() {
            this.immForm.id = "";
            this.immForm.immunizationTypeId = "";
            this.immForm.immunizationTypeName = "";
            this.immForm.isImmunized = false;
            this.immForm.immunizationDate = "";

            $("#immunizationTypeId").ejDropDownList("value", "");
        },



        toast(msg) {
            toastr.success(msg);
        }
    },

    mounted() {
        this.getStudent();
        this.loadImmunizationTypes();
        this.loadImmunizations();
        this.loadMedical();
    }
});
app.mount('#app');