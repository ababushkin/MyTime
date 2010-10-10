/*
 MyTime - MySource Matrix Performance Timing v1.0
 http://www.mysourceusers.com/mytime
 
 Copyright 2010, Anton Babushkin (babushkin.anton@gmail.com)
 
 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
  Mandatory Configuration.
  Without these config settings, MyTime will not work.
*/
MyTime.CONFIG = {
  jsAPIKey: null, /* int: can be found on the details screen of your JS API */
  parentID: "", /* string: assets are created here */
  newLinkID: null, /* int: assets are new linked here */
  metadataFieldID: null, /* int: some random metadata is saved here */
};

/*
  Optional Configuration.
  These config settings are not required, however I recommend that you set them up.
  They're used for recording how fast the actions took to complete.
  The results are stored against the asset that gets created as part of the test.
*/
MyTime.RESULTS = {
  createAsset: null,
  getChildren: [],
  acquireLockDetails: null,
  getContents: [],
  saveContents: [],
  previewContents: null,
  releaseLockContents: null,
  acquireLockMetadata: null,
  getMetadata: null,
  saveMetadata: null,
  releaseLockMetadata: null,
  createLink: null,
  setAssetStatusLive: null
};