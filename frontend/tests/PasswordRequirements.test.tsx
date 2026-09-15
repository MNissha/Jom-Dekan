import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PasswordRequirementsChecklist } from '../src/components/common/PasswordRequirements';

describe('PasswordRequirementsChecklist', () => {
  it('shows every password rule in a single accessible checklist', () => {
    render(<PasswordRequirementsChecklist password="" />);

    expect(screen.getByRole('list', { name: 'Password requirements' })).toBeInTheDocument();
    expect(screen.getByText('8 characters')).toBeInTheDocument();
    expect(screen.getByText('At least 1 uppercase letter')).toBeInTheDocument();
    expect(screen.getByText('At least 1 number')).toBeInTheDocument();
    expect(screen.getByText('At least 1 special character')).toBeInTheDocument();
    expect(screen.getAllByText(/requirement not met/)).toHaveLength(4);
  });

  it('updates every rule to the completed state for a valid password', () => {
    render(<PasswordRequirementsChecklist password="JomDekan1!" />);

    expect(screen.getAllByText(/requirement met/)).toHaveLength(4);
    expect(screen.queryByText(/requirement not met/)).not.toBeInTheDocument();
  });
});
