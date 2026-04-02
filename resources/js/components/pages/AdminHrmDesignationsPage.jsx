import React from 'react';
import AdminHrmNameCrudPage from './AdminHrmNameCrudPage.jsx';

export default function AdminHrmDesignationsPage(props) {
    return (
        <AdminHrmNameCrudPage
            {...props}
            title="Designation Create & Index"
            createLabel="Create Designation"
            endpoint="/hrm/designations"
            responseKey="designations"
            nameLabel="Designation"
            confirmDeleteLabel="designation"
        />
    );
}
