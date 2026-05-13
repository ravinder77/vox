import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

export const renderWithProviders = (ui) =>
    render(<MemoryRouter>{ui}</MemoryRouter>);