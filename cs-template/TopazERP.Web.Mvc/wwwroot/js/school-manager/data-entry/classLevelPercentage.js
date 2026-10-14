const app = Vue.createApp({
    data() {
        return {
            academicYears: [],
            levelList: [],
            saving: false,
            allRecords: [],
            detailsList: []
        }
    },

    mounted() {
        this.loadDropdowns();
    },

    methods: {
        printPreview() {
            if (!this.allRecords || this.allRecords.length === 0) {
                this.toastHandler('warning', 'No data to print.');
                return;
            }

            const currentDate = new Date().toLocaleDateString();
            let html = `
    <html>
    <head>
        <title>Class Level Percentages Report</title>
        <style>
             body { font-family:"Times New Roman"; margin: 20px; }
            h3, h4 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 12px; }
            thead {border-bottom: 1px solid #000;}
            th { background-color: #f2f2f2; border : none;}
            td {border: none;}
            
            @media print {
                body { margin-bottom: 100px; }
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
                }
                .page-break { page-break-after: always; }
            }
        </style>
    </head>
    <body>
    `;

            this.allRecords.forEach((year, index) => {
                if (!year.details || year.details.length === 0) return;

                html += `
        <h4><strong>Class Level Percentages - ${year.academicYearName}</strong></h4>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Level</th>
                    <th>Exam %</th>
                    <th>Class %</th>
                </tr>
            </thead>
            <tbody>
        `;

                year.details.forEach((d, i) => {
                    html += `
            <tr>
                <td>${i + 1}</td>
                <td>${d.levelName || ''}</td>
                <td>${d.examPercentage}</td>
                <td>${d.classPercentage}</td>
            </tr>
            `;
                });

                html += `
            </tbody>
        </table>
       <div class="footer">
                <div class="right">Printed On - ${currentDate}</div>
                 <div class="center">Topaz School Manager</div>
                <div class="left">Page 1</div>
        </div>
        `;

                // Add page break after each year except the last
                if (index < this.allRecords.length - 1) {
                    html += '<div class="page-break"></div>';
                }
            });

            html += `</body></html>`;

            const printWindow = window.open('', '', 'width=900,height=600');
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        },

        loadDropdowns() {
            axios.all([
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get('/SmMainSetups/ListAllLevels/')
            ]).then(axios.spread((years, levels) => {
                this.academicYears = years.data;
                this.levelList = levels.data;
                
                this.getAllRecords();
            }));
        },

        getAllRecords() {
            axios.get('/SmDataEntry/GetAllClassLevelPercentages')
                .then(res => {
                    const existingRecords = res.data;

                    // map academic years to parent rows
                    this.allRecords = this.academicYears.map(ay => {
                        const match = existingRecords.find(r => r.academicYearId === ay.id);
                        return match ? {
                            ...match,
                            academicYearName: ay.name,
                            isSaved: true
                        } : {
                            id: this.uuid(),
                            academicYearId: ay.id,
                            academicYearName: ay.name,
                            details: [],
                            isSaved: false
                        };

                    });


                    // populate detailsList
                    this.detailsList = [];
                    this.allRecords.forEach(p => {
                        p.classLevelPercentageId = p.id;
                        if (p.details && Array.isArray(p.details)) {
                            p.details.forEach(detail => {
                                detail.classLevelPercentageId = p.id;
                                this.detailsList.push(detail);
                            });
                        }
                    });

                    this.dataTable(this.allRecords);
                });
        },
        validateAndSyncPercentages(row) {
            const exam = Number(row.examPercentage || 0);
            const cls  = Number(row.classPercentage || 0);

            // negative or above 100 is invalid
            if (exam < 0 || cls < 0 || exam > 100 || cls > 100) {
                this.toastHandler('error', 'Percentages must be between 0 and 100.');
                return false;
            }

            // auto-calc logic
            if (exam > 0 && cls === 0) {
                row.classPercentage = 100 - exam;
            }
            else if (cls > 0 && exam === 0) {
                row.examPercentage = 100 - cls;
            }

            // final validation
            if ((row.examPercentage + row.classPercentage) !== 100) {
                this.toastHandler(
                    'error',
                    'Exam % and Class % must sum up to 100.'
                );
                return false;
            }

            return true;
        },
        dataTable(responseData) {
            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                pageSettings: {
                    pageSize: 20,
                    pageSizeList: [10, 20, 50, 100]
                },
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                childGrid: {
                    dataSource: this.detailsList,
                    queryString: "classLevelPercentageId",
                    allowPaging: true,
                    allowSorting: true,
                    isResponsive: true,
                    pageSettings: { pageSize: 10 },
                    editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                    toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                    columns: [
                        { field: "id", headerText: 'Id', visible: false, isPrimaryKey: true, },
                        { field: "classLevelPercentageId", headerText: 'classLevelPercentageId', visible: false, },
                        {
                            field: "levelId",
                            headerText: "Level",
                            width: 80,
                            editType: ej.Grid.EditingType.DropDown,
                            foreignKeyField: "id",
                            foreignKeyValue: "levelName",
                            dataSource: this.levelList,
                            editParams: {
                                dataSource: this.levelList,
                                fields: { text: "levelName", value: "id" }
                            },
                            validationRules: { required: false }
                        },
                        { field: "examPercentage", headerText: "Exam %", width: 65, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, validationRules: { required: true, min: 0, max: 100000 } },
                        { field: "classPercentage", headerText: "Class %", width: 65, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, validationRules: { required: true, min: 0, max: 100000 } },

                    ],
                    endAdd: (args) => {
                        // sync levelName
                        if (args.data.levelId) {
                            const level = this.levelList.find(l => l.id === args.data.levelId);
                            if (level) args.data.levelName = level.levelName;
                        }

                        // percentage rule
                        if (!this.validateAndSyncPercentages(args.data)) {
                            args.cancel = true; // stop grid commit
                            return;
                        }

                        this.saveDetail(args.data);
                    },

                    endEdit: (args) => {
                        // sync levelName
                        if (args.data.levelId) {
                            const level = this.levelList.find(l => l.id === args.data.levelId);
                            if (level) args.data.levelName = level.levelName;
                        }

                        // percentage rule
                        if (!this.validateAndSyncPercentages(args.data)) {
                            args.cancel = true; // stop grid commit
                            return;
                        }

                        this.updateDetail(args.data);
                    },

                    endDelete: (args) => {
                        this.delDetail(args.data.id);
                    }

                },
                columns: [
                    { field: "id", headerText: "id", width: 15, visible: false, isPrimaryKey: true,  },
                    {
                        field: "academicYearName",
                        headerText: "Academic Year",
                        width: 250,
                        validationRules: { required: false }
                    },

                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15 }
                ],
            });
        },
        updateData(payload) {
            payload.details = this.detailsList.filter(
                d => d.classLevelPercentageId === payload.id
            );

            axios.post('/SmDataEntry/UpdateClassLevelPercentage', payload)
                .then(response => {
                    this.getAllRecords();
                    this.toastHandler('', 'data updated.');
                }).catch(err => {
                this.toastHandler('error', 'Unable to update data.');
            });
        },

        saveDetail(payload) {
            payload.id = this.uuid();
            this.detailsList.push(payload);

            let parent = this.allRecords.find(h => h.id === payload.classLevelPercentageId);

            // if parent is not saved yet, create it first
            if (!parent.isSaved) {
                const newParent = {
                    id: payload.classLevelPercentageId,
                    academicYearId: parent.academicYearId,
                    academicYearName: parent.academicYearName,
                    details: [payload]
                };

                axios.post('/SmDataEntry/CreateClassLevelPercentage', newParent)
                    .then(response => {
                       
                        if (response.data.code === 200) {
                            parent.isSaved = true;
                            parent.id = response.data.id;
                            parent.details = response.data.details;
                            this.getAllRecords();
                            this.toastHandler('', 'Data saved successfully.');
                        } else {
                            this.toastHandler('error', response.data.message);
                            this.getAllRecords();
                        }
                    }).catch(err => {
                    this.toastHandler('error', 'Unable to save data.');
                });

            } else {
                this.updateData(parent);
            }
        },

        updateDetail(payload) {
            const index = this.detailsList.findIndex(d => d.id === payload.id);
            if (index !== -1) {
                this.detailsList.splice(index, 1, { ...payload });
            }
            if (payload.classLevelPercentageId) {
                const data = this.allRecords.find(h => h.id === payload.classLevelPercentageId);
                if (data) this.updateData(data);
            }
        },

        delDetail(id) {
            const index = this.detailsList.findIndex(d => d.id === id);
            if (index !== -1) {
                const classLevelPercentageId = this.detailsList[index].classLevelPercentageId;
                this.detailsList.splice(index, 1);

                const data = this.allRecords.find(h => h.id === classLevelPercentageId);
                if (data) this.updateData(data);
            }
        },
        

        uuid() {
            return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        },

        toastHandler(type, message) {
            toastr.options = { closeButton:true, progressBar:true, timeOut:4000 };
            type === 'error' ? toastr.error(message) : toastr.success(message);
        }
    }
});
app.mount('#app');