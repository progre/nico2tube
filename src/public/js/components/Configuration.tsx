import { Button, FormControl, FormLabel, TextField } from 'material-ui';
import React from 'react';

export default function Configuration(props: {
  niconicoEmail: string;
  niconicoPassword: string;
  workingFolderPath: string;

  onNiconicoEmailChange(e: React.ChangeEvent<HTMLInputElement>): void;
  onNiconicoPasswordChange(e: React.ChangeEvent<HTMLInputElement>): void;
  onWorkingFolderPathChange(e: React.ChangeEvent<HTMLInputElement>): void;
  onYoutubeAuthenticateClick(e: React.MouseEvent<HTMLInputElement>): void;
}) {
  return (
    <>
      <FormControl component="fieldset" style={{ width: '100%' }}>
        <FormLabel component="legend">niconico</FormLabel>
        <TextField
          label="email"
          fullWidth={true}
          value={props.niconicoEmail}
          onChange={props.onNiconicoEmailChange}
        />
        <TextField
          label="password"
          type="password"
          fullWidth={true}
          value={props.niconicoPassword}
          onChange={props.onNiconicoPasswordChange}
        />
      </FormControl>
      <FormControl component="fieldset" style={{ width: '100%', marginTop: '60px' }}>
        <FormLabel component="legend">Working folder</FormLabel>
        <TextField
          label="path"
          fullWidth={true}
          value={props.workingFolderPath}
          onChange={props.onWorkingFolderPathChange}
        />
      </FormControl>
      <FormControl component="fieldset" style={{ width: '100%', marginTop: '60px' }}>
        <FormLabel component="legend">YouTube</FormLabel>
        <div style={{ textAlign: 'center' }}>
          <Button
            variant="raised"
            style={{ display: 'inline-block' }}
            onClick={props.onYoutubeAuthenticateClick}
          >authenticate</Button>
        </div>
      </FormControl>
    </>
  );
}
